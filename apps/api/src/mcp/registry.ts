import type { MCPName } from '../lib/types.js'

// Maps MCP names to their server URLs.
// Values come from env vars so Railway / local devs can override independently.
export const MCPRegistry: Record<MCPName, string> = {
  'tableau-mcp': process.env['TABLEAU_MCP_URL'] ?? 'http://localhost:3002',
  'export-mcp': process.env['EXPORT_MCP_URL'] ?? 'http://localhost:3003',
}
