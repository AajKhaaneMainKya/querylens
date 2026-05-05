import type { AgentContext, OrchestratorResult, Intent } from '../lib/types.js'
import { chatWithTools } from '../services/llm.js'
import type { LLMTool } from '../services/llm.js'
import { supabase } from '../lib/supabase.js'
import { QueryAgent } from './query-agent.js'
import { SchemaAgent } from './schema-agent.js'

interface IntentToolResult {
  intent: Intent
  target_agent?: 'QueryAgent' | 'ExportAgent' | 'SchemaAgent' | null
  clarify_question?: string
}

const classifyIntentTool: LLMTool = {
  name: 'classify_intent',
  description: 'Classify the user query intent and route to the right agent.',
  parameters: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['visualize', 'export', 'schema', 'clarify'],
        description:
          'visualize=wants a chart | export=wants to download | schema=asks what data exists | clarify=too vague to route',
      },
      target_agent: {
        type: 'string',
        enum: ['QueryAgent', 'ExportAgent', 'SchemaAgent'],
        description: 'Omit only when intent is clarify',
      },
      clarify_question: {
        type: 'string',
        description: 'Only set when intent is clarify. One concise question to the user.',
      },
    },
    required: ['intent'],
  },
}

export class OrchestratorAgent {
  private queryAgent = new QueryAgent()
  private schemaAgent = new SchemaAgent()

  async run(input: string, context: AgentContext): Promise<OrchestratorResult> {
    // 1. Load client name for the system prompt
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', context.clientId)
      .single()
    const clientName = client?.name ?? 'the client'

    // 2. Build conversation history for the prompt (last 10 messages)
    const historyText = context.sessionMessages
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    // 3. Classify intent
    const llmResponse = await chatWithTools(
      [
        {
          role: 'system',
          content:
            `You are QueryLens, an AI assistant for ${clientName}. ` +
            `Classify the user query and route it to the right agent.\n` +
            `Agents:\n` +
            `- QueryAgent: user wants a chart or filtered data visualisation\n` +
            `- SchemaAgent: user asks what data, workbooks, or views are available\n` +
            `- ExportAgent: user wants to download a chart as PNG or PDF\n` +
            (historyText ? `\nConversation so far:\n${historyText}` : ''),
        },
        { role: 'user', content: input },
      ],
      [classifyIntentTool],
    )

    const toolInput = llmResponse.toolCalls[0]?.input as IntentToolResult | undefined

    if (!toolInput || toolInput.intent === 'clarify') {
      return {
        success: true,
        agentName: 'OrchestratorAgent',
        intent: 'clarify',
        clarifyQuestion:
          toolInput?.clarify_question ?? 'Could you clarify what you would like to do?',
      }
    }

    // 4. Route to specialist agent
    const intent = toolInput.intent
    const target = toolInput.target_agent ?? (intent === 'visualize' ? 'QueryAgent' : intent === 'schema' ? 'SchemaAgent' : null)

    if (target === 'QueryAgent') {
      const result = await this.queryAgent.run(input, context)
      return {
        success: result.success,
        agentName: 'OrchestratorAgent',
        intent: 'visualize',
        data: result.data,
        clarifyQuestion: result.clarifyQuestion,
        errorMessage: result.errorMessage,
      }
    }

    if (target === 'SchemaAgent') {
      const result = await this.schemaAgent.run(input, context)
      return {
        success: result.success,
        agentName: 'OrchestratorAgent',
        intent: 'schema',
        data: result.data,
        clarifyQuestion: result.clarifyQuestion,
        errorMessage: result.errorMessage,
      }
    }

    if (target === 'ExportAgent' || intent === 'export') {
      // TODO: Week 7 — wire ExportAgent
      return {
        success: false,
        agentName: 'OrchestratorAgent',
        intent: 'export',
        errorMessage: 'Export is not yet available. It is coming in a future update.',
      }
    }

    return {
      success: false,
      agentName: 'OrchestratorAgent',
      intent,
      errorMessage: `Could not route query. Please try rephrasing.`,
    }
  }
}
