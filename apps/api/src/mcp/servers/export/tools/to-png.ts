import type { MCPToolResult } from '@querylens/shared'

export interface ToPngInput {
  viewUrl: string
}

// Tool: to-png
// Renders a Tableau view as a PNG and returns the raw image buffer.
export async function toPng(_input: ToPngInput): Promise<MCPToolResult> {
  // TODO: Week 7
  // 1. Auth with Tableau REST API
  // 2. GET /api/2.1/sites/{siteId}/views/{viewId}/image
  // 3. Return image buffer (caller uploads to Supabase Storage)
  throw new Error('to-png not yet implemented')
}
