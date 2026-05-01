import type { MCPToolResult } from '@querylens/shared'
import { getSession, API_BASE } from '../../tableau/auth.js'

export interface ToPngInput {
  viewId: string  // Tableau view LUID (UUID from list-views, not the slug)
}

export async function toPng(input: ToPngInput): Promise<MCPToolResult> {
  const start = Date.now()
  const { token, siteId } = await getSession()

  const response = await fetch(
    `${API_BASE}/sites/${siteId}/views/${input.viewId}/image`,
    { headers: { 'X-Tableau-Auth': token } },
  )

  if (!response.ok) {
    throw new Error(
      `Tableau image download failed (${response.status}): ${await response.text()}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer).toString('base64')

  return {
    success: true,
    data: { buffer, mimeType: 'image/png', filename: 'export.png' },
    durationMs: Date.now() - start,
  }
}
