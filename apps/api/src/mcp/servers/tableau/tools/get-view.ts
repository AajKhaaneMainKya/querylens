import type { MCPToolResult } from '../../../../lib/types.js'
import { getSession, tableauFetch } from '../auth.js'

export interface GetViewInput {
  clientId: string
  viewId: string  // Tableau view LUID
}

interface TableauViewBody {
  view: {
    id: string
    name: string
    contentUrl: string
    createdAt: string
    updatedAt: string
    owner: { id: string }
    workbook: { id: string }
    project: { id: string }
  }
}

export async function getView(input: GetViewInput): Promise<MCPToolResult> {
  const start = Date.now()
  const { siteId } = await getSession()

  const res = await tableauFetch(`/sites/${siteId}/views/${input.viewId}`)
  if (!res.ok) {
    throw new Error(`get-view failed (${res.status}): ${await res.text()}`)
  }

  const body = (await res.json()) as TableauViewBody
  return {
    success: true,
    data: body.view,
    durationMs: Date.now() - start,
  }
}
