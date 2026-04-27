import type { MCPToolResult } from '@querylens/shared'

export interface ToPdfInput {
  viewUrl: string
}

// Tool: to-pdf
// Renders a Tableau view as a PDF and returns the raw PDF buffer.
export async function toPdf(_input: ToPdfInput): Promise<MCPToolResult> {
  // TODO: Week 7
  // 1. Auth with Tableau REST API
  // 2. GET /api/2.1/sites/{siteId}/views/{viewId}/pdf
  // 3. Return PDF buffer (caller uploads to Supabase Storage)
  throw new Error('to-pdf not yet implemented')
}
