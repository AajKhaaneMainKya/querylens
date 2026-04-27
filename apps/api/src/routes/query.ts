import { Router } from 'express'
import type { Request, Response } from 'express'
import type { QueryResponse } from '@querylens/shared'
import { authenticate } from '../middleware/auth.js'

export const queryRouter = Router()

// POST /query — receives a plain English query, routes to OrchestratorAgent
// TODO: Week 6 — instantiate OrchestratorAgent and call run()
queryRouter.post('/', authenticate, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    errorMessage: 'Not yet implemented',
    conversationId: '',
  } satisfies QueryResponse)
})
