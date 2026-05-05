import type { MCPToolResult } from '../../../../lib/types.js'
import { getSession, tableauFetch } from '../auth.js'

export interface ListViewsInput {
  clientId: string
  workbookId?: string  // optional — filter to views within a specific workbook
}

interface TableauView {
  id: string
  name: string
  contentUrl: string
  createdAt: string
  updatedAt: string
  owner: { id: string }
  workbook: { id: string }
  project: { id: string }
}

interface ListViewsBody {
  pagination: { pageNumber: number; pageSize: number; totalAvailable: number }
  views: { view?: TableauView[] }
}

export async function listViews(input: ListViewsInput): Promise<MCPToolResult> {
  const start = Date.now()
  const { siteId } = await getSession()

  const params = new URLSearchParams({ pageSize: '100' })
  if (input.workbookId) params.set('workbookId', input.workbookId)

  const res = await tableauFetch(`/sites/${siteId}/views?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`list-views failed (${res.status}): ${await res.text()}`)
  }

  const body = (await res.json()) as ListViewsBody
  const views = body.views.view ?? []

  return {
    success: true,
    data: {
      total: body.pagination.totalAvailable,
      views: views.map((v) => {
        // contentUrl format: "{WorkbookContentUrl}/sheets/{ViewContentUrl}"
        // The /views endpoint only returns workbook.id — derive the slugs from contentUrl.
        const [workbookContentUrl, viewContentUrl] = v.contentUrl.split('/sheets/')
        return {
          id: v.id,
          name: v.name,
          contentUrl: v.contentUrl,
          viewContentUrl: viewContentUrl ?? v.contentUrl,
          workbookId: v.workbook.id,
          workbookContentUrl: workbookContentUrl ?? '',
        }
      }),
    },
    durationMs: Date.now() - start,
  }
}
