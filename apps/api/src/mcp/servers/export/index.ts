import express from 'express'
import type { MCPToolResult } from '@querylens/shared'
import { toPng } from './tools/to-png.js'
import { toPdf } from './tools/to-pdf.js'

const app = express()
const PORT = process.env['PORT'] ?? 3003

app.use(express.json())

type ToolFn = (input: unknown) => Promise<MCPToolResult>

const tools: Record<string, ToolFn> = {
  'to-png': toPng as ToolFn,
  'to-pdf': toPdf as ToolFn,
}

app.post('/call', async (req, res) => {
  const { tool, input } = req.body as { tool?: string; input?: unknown }

  if (!tool || !tools[tool]) {
    res.status(400).json({ success: false, error: `Unknown tool: ${String(tool)}`, durationMs: 0 })
    return
  }

  try {
    const result = await tools[tool]!(input)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message, durationMs: 0 })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'export-mcp' })
})

app.listen(Number(PORT), () => {
  console.log(`export-mcp running on port ${PORT}`)
})
