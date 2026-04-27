import type { MCPToolResult } from '@querylens/shared'
import { getSession, tableauFetch } from '../auth.js'

export interface ListWorkbooksInput {
  clientId: string
}

interface TableauWorkbook {
  id: string
  name: string
  contentUrl: string
  project: { id: string; name: string }
}

interface ListWorkbooksBody {
  pagination: { pageNumber: number; pageSize: number; totalAvailable: number }
  workbooks: { workbook?: TableauWorkbook[] }
}

export async function listWorkbooks(input: ListWorkbooksInput): Promise<MCPToolResult> {
  const start = Date.now()
  const { siteId } = await getSession()

  const res = await tableauFetch(`/sites/${siteId}/workbooks?pageSize=100`)
  if (!res.ok) {
    throw new Error(`list-workbooks failed (${res.status}): ${await res.text()}`)
  }

  const body = (await res.json()) as ListWorkbooksBody
  const workbooks = body.workbooks.workbook ?? []

  return {
    success: true,
    data: {
      total: body.pagination.totalAvailable,
      workbooks: workbooks.map((wb) => ({
        id: wb.id,
        name: wb.name,
        contentUrl: wb.contentUrl,
        projectName: wb.project.name,
      })),
    },
    durationMs: Date.now() - start,
  }
}
