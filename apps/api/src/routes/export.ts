import { Router } from 'express'
import type { Request, Response } from 'express'
import type { ExportFormat } from '@querylens/shared'
import { authenticate } from '../middleware/auth.js'
import { ExportAgent } from '../agents/export-agent.js'

export const exportRouter = Router()

const exportAgent = new ExportAgent()

exportRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const { viewUrl, format, clientId } = req.body as {
    viewUrl: string
    format: ExportFormat
    clientId: string
  }

  if (!viewUrl || !format || !clientId) {
    res.status(400).json({ success: false, errorMessage: 'viewUrl, format, and clientId are required' })
    return
  }

  if (format !== 'png' && format !== 'pdf') {
    res.status(400).json({ success: false, errorMessage: 'format must be png or pdf' })
    return
  }

  // Per-request Tableau credentials forwarded from the connection screen
  const tableauUrl    = req.headers['x-tableau-url'] as string | undefined
  const tableauSiteId = req.headers['x-tableau-site-id'] as string | undefined
  const tableauToken  = req.headers['x-tableau-token'] as string | undefined

  const tableauCreds =
    tableauUrl && tableauToken
      ? { serverUrl: tableauUrl, siteId: tableauSiteId ?? '', token: tableauToken }
      : undefined

  const result = await exportAgent.run(
    { viewUrl, format },
    { clientId, conversationId: '', sessionMessages: [], tableauCreds },
  )

  if (!result.success) {
    res.status(500).json({ success: false, errorMessage: result.errorMessage })
    return
  }

  res.json({ success: true, data: result.data })
})
