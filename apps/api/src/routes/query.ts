import { Router } from 'express'
import type { Request, Response } from 'express'
import type { QueryRequest, QueryResponse, ConversationMessage } from '@querylens/shared'
import { authenticate } from '../middleware/auth.js'
import { OrchestratorAgent } from '../agents/orchestrator.js'
import { supabase } from '../lib/supabase.js'

export const queryRouter = Router()

const orchestrator = new OrchestratorAgent()

queryRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const { query, clientId, userId, conversationId } = req.body as QueryRequest

  if (!query || !clientId) {
    res.status(400).json({
      success: false,
      errorMessage: 'query and clientId are required',
      conversationId: conversationId ?? '',
    } satisfies QueryResponse)
    return
  }

  // Load existing conversation or create a new one
  let convId = conversationId
  let sessionMessages: ConversationMessage[] = []

  if (convId) {
    const { data } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', convId)
      .single()
    sessionMessages = (data?.messages ?? []) as ConversationMessage[]
  } else {
    const { data } = await supabase
      .from('conversations')
      .insert({ client_id: clientId, user_email: userId ?? null, messages: [] })
      .select('id')
      .single()
    convId = data?.id ?? crypto.randomUUID()
  }

  try {
    const result = await orchestrator.run(query, {
      clientId,
      userId,
      conversationId: convId!,
      sessionMessages,
    })

    // Persist user turn + assistant response
    const updatedMessages: ConversationMessage[] = [
      ...sessionMessages,
      { role: 'user', content: query, timestamp: new Date().toISOString() },
      {
        role: 'assistant',
        content: result.clarifyQuestion ?? JSON.stringify(result.data ?? {}),
        timestamp: new Date().toISOString(),
        agent: 'OrchestratorAgent',
      },
    ]
    await supabase
      .from('conversations')
      .update({ messages: updatedMessages, last_active_at: new Date().toISOString() })
      .eq('id', convId)

    res.json({
      success: result.success,
      result,
      conversationId: convId,
    } satisfies QueryResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      success: false,
      errorMessage: message,
      conversationId: convId ?? '',
    } satisfies QueryResponse)
  }
})
