import { Router } from 'express'
import type { Request, Response } from 'express'
import type { SchemaSyncResponse } from '@querylens/shared'
import { authenticate } from '../middleware/auth.js'

export const schemaRouter = Router()

// POST /schema/sync — triggers SchemaAgent to ingest Tableau workbooks for a client
// TODO: Week 4 — instantiate SchemaAgent and call run() in 'sync' mode
schemaRouter.post('/sync', authenticate, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    workbooksIngested: 0,
    errorMessage: 'Not yet implemented',
  } satisfies SchemaSyncResponse)
})
