import express from 'express'
import type { MCPToolResult } from '@querylens/shared'
import { getSession } from './auth.js'
import { applyFilters } from './tools/apply-filters.js'
import { getView } from './tools/get-view.js'
import { embedWorkbook } from './tools/embed-workbook.js'
import { listViews } from './tools/list-views.js'
import { listWorkbooks } from './tools/list-workbooks.js'

const app = express()
const PORT = process.env['PORT'] ?? 3002

app.use(express.json())

type ToolFn = (input: unknown) => Promise<MCPToolResult>

const tools: Record<string, ToolFn> = {
  'apply-filters': applyFilters as ToolFn,
  'get-view': getView as ToolFn,
  'embed-workbook': embedWorkbook as ToolFn,
  'list-views': listViews as ToolFn,
  'list-workbooks': listWorkbooks as ToolFn,
}

// POST /call — MCPRouter sends { tool, input } here to invoke any tableau tool
app.post('/call', async (req, res) => {
  const { tool, input } = req.body as { tool?: string; input?: unknown }

  if (!tool || !tools[tool]) {
    res.status(400).json({ success: false, error: `Unknown tool: ${String(tool)}`, durationMs: 0 })
    return
  }

  // Forward per-request Tableau credentials from MCPRouter headers into the tool input
  const tableauUrl   = req.headers['x-tableau-url'] as string | undefined
  const tableauSiteId = req.headers['x-tableau-site-id'] as string | undefined
  const tableauToken = req.headers['x-tableau-token'] as string | undefined

  const tableauCreds =
    tableauUrl && tableauToken
      ? { serverUrl: tableauUrl, siteId: tableauSiteId ?? '', token: tableauToken }
      : undefined

  const enrichedInput = { ...(input as object), ...(tableauCreds ? { tableauCreds } : {}) }

  try {
    const result = await tools[tool]!(enrichedInput)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message, durationMs: 0 })
  }
})

// GET /health — verifies Tableau auth is working; used by MCPRouter on startup
app.get('/health', async (_req, res) => {
  try {
    const { siteId } = await getSession()
    res.json({ status: 'ok', siteId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(503).json({ status: 'error', error: message })
  }
})

app.listen(Number(PORT), () => {
  console.log(`tableau-mcp running on port ${PORT}`)
})
