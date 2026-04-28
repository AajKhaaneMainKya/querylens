import { Router } from 'express'
import type { Request, Response } from 'express'
import type { SchemaSyncRequest, SchemaSyncResponse } from '@querylens/shared'
import { authenticate } from '../middleware/auth.js'
import { SchemaAgent } from '../agents/schema-agent.js'

export const schemaRouter = Router()

const schemaAgent = new SchemaAgent()

schemaRouter.post('/sync', authenticate, async (req: Request, res: Response) => {
  const { clientId } = req.body as SchemaSyncRequest

  if (!clientId) {
    res.status(400).json({
      success: false,
      workbooksIngested: 0,
      errorMessage: 'clientId is required',
    } satisfies SchemaSyncResponse)
    return
  }

  try {
    const result = await schemaAgent.run('', { clientId, conversationId: '', sessionMessages: [] }, 'sync')

    res.json({
      success: result.success,
      workbooksIngested: result.data?.workbooks.length ?? 0,
      errorMessage: result.errorMessage,
    } satisfies SchemaSyncResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      success: false,
      workbooksIngested: 0,
      errorMessage: message,
    } satisfies SchemaSyncResponse)
  }
})
