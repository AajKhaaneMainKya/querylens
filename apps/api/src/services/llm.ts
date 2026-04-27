// LLM adapter — single gateway for all language model calls in QueryLens.
// All agents call chat() or chatWithTools() from here. No direct Ollama calls elsewhere.

const BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
const DEFAULT_MODEL = process.env['OLLAMA_MODEL'] ?? 'mistral'

// ─── Public types (used by agents) ────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMTool {
  name: string
  description: string
  parameters: Record<string, unknown>  // JSON Schema object
}

export interface LLMToolCall {
  name: string
  input: Record<string, unknown>
}

export interface LLMResponse {
  content: string
  toolCalls: LLMToolCall[]
}

export interface LLMOptions {
  model?: string
  temperature?: number
}

export class LLMError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'LLMError'
  }
}

// ─── Ollama API types (internal) ──────────────────────────────────────────────

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  tool_calls?: Array<{
    function: { name: string; arguments: Record<string, unknown> }
  }>
}

interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface OllamaChatRequest {
  model: string
  messages: OllamaMessage[]
  tools?: OllamaTool[]
  stream: false
  options?: { temperature?: number }
}

interface OllamaChatResponse {
  model: string
  message: OllamaMessage
  done: boolean
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function callOllama(body: OllamaChatRequest): Promise<OllamaChatResponse> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new LLMError(`Ollama unreachable at ${BASE_URL}`, err)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new LLMError(`Ollama responded ${response.status}: ${text}`)
  }

  return response.json() as Promise<OllamaChatResponse>
}

function toOllamaTools(tools: LLMTool[]): OllamaTool[] {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

function parseResponse(message: OllamaMessage): LLMResponse {
  const toolCalls: LLMToolCall[] =
    message.tool_calls?.map((tc) => ({
      name: tc.function.name,
      input: tc.function.arguments,
    })) ?? []
  return { content: message.content ?? '', toolCalls }
}

// ─── JSON validation helpers ──────────────────────────────────────────────────

function tryParseJSON(text: string): unknown {
  // Strip markdown code fences models commonly add around JSON (```json ... ``` or ``` ... ```)
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    return undefined
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function chat(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const data = await callOllama({
    model: options.model ?? DEFAULT_MODEL,
    messages,
    stream: false,
    options: options.temperature !== undefined ? { temperature: options.temperature } : undefined,
  })
  return parseResponse(data.message)
}

// Calls chat() and parses the response as JSON.
// If the response isn't valid JSON, retries once with an explicit correction prompt.
// Logs a warning when a retry was needed so callers can track model reliability.
export async function chatJSON<T = unknown>(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<T> {
  const first = await chat(messages, options)
  const parsed = tryParseJSON(first.content)
  if (parsed !== undefined) return parsed as T

  console.warn('[llm] Response was not valid JSON — retrying with explicit JSON prompt')
  const retry = await chat(
    [
      ...messages,
      { role: 'assistant', content: first.content },
      { role: 'user', content: 'Return only valid JSON, no prose, no markdown.' },
    ],
    options,
  )
  const retryParsed = tryParseJSON(retry.content)
  if (retryParsed === undefined) {
    throw new LLMError(`Model did not return valid JSON after retry. Got: ${retry.content}`)
  }
  return retryParsed as T
}

export async function chatWithTools(
  messages: LLMMessage[],
  tools: LLMTool[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const data = await callOllama({
    model: options.model ?? DEFAULT_MODEL,
    messages,
    tools: toOllamaTools(tools),
    stream: false,
    options: options.temperature !== undefined ? { temperature: options.temperature } : undefined,
  })
  return parseResponse(data.message)
}
