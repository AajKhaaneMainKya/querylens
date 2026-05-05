// LLM adapter — single gateway for all language model calls in QueryLens.
// All agents call chat() or chatWithTools() from here. No direct Groq calls elsewhere.

import OpenAI from 'openai'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = process.env['GROQ_MODEL'] ?? 'llama-3.3-70b-versatile'

const groq = new OpenAI({
  apiKey: process.env['GROQ_API_KEY'] ?? '',
  baseURL: GROQ_BASE_URL,
})

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toGroqTools(tools: LLMTool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

function parseResponse(message: OpenAI.Chat.ChatCompletionMessage): LLMResponse {
  const toolCalls: LLMToolCall[] =
    message.tool_calls?.map((tc) => ({
      name: (tc as any).function.name as string,
      input: JSON.parse((tc as any).function.arguments as string) as Record<string, unknown>,
    })) ?? []
  return { content: message.content ?? '', toolCalls }
}

// ─── JSON validation helpers ──────────────────────────────────────────────────

function tryParseJSON(text: string): unknown {
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
  let response: OpenAI.Chat.ChatCompletion
  try {
    response = await groq.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature,
    })
  } catch (err) {
    throw new LLMError('Groq request failed', err)
  }
  const message = response.choices[0]?.message
  if (!message) throw new LLMError('Groq returned no choices')
  return parseResponse(message)
}

// Calls chat() and parses the response as JSON.
// If the response isn't valid JSON, retries once with an explicit correction prompt.
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
  let response: OpenAI.Chat.ChatCompletion
  try {
    response = await groq.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      tools: toGroqTools(tools),
      tool_choice: 'required',
      temperature: options.temperature,
    })
  } catch (err) {
    throw new LLMError('Groq tool-call request failed', err)
  }
  const message = response.choices[0]?.message
  if (!message) throw new LLMError('Groq returned no choices')
  return parseResponse(message)
}
