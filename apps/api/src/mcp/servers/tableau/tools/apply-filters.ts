import type { TableauFilterSpec, TableauFilter, MCPToolResult } from '@querylens/shared'
import { getSession, SERVER_BASE } from '../auth.js'

export interface ApplyFiltersInput extends TableauFilterSpec {
  clientId: string
  workbookContentUrl: string  // workbook slug, e.g. "SalesAnalysis"
  viewContentUrl: string      // view slug within workbook, e.g. "Overview"
  tableauCreds?: { serverUrl: string; siteId: string; token: string }
}

// Tableau URL filter params use the vf_ prefix.
// Only eq, in, and between map cleanly to URL params — others are logged and skipped.
function buildFilterParams(filters: TableauFilter[]): URLSearchParams {
  const params = new URLSearchParams()
  for (const f of filters) {
    const key = `vf_${f.field}`
    switch (f.operator) {
      case 'eq':
        params.append(key, String(f.value))
        break
      case 'in':
        if (Array.isArray(f.value)) {
          params.append(key, (f.value as string[]).join(','))
        }
        break
      case 'between':
        if (Array.isArray(f.value) && f.value.length === 2) {
          params.append(key, `${String(f.value[0])},${String(f.value[1])}`)
        }
        break
      default:
        console.warn(`[apply-filters] Operator '${f.operator}' not supported in URL params — skipping field '${f.field}'`)
    }
  }
  return params
}

export async function applyFilters(input: ApplyFiltersInput): Promise<MCPToolResult> {
  const start = Date.now()

  let serverBase: string
  if (input.tableauCreds) {
    serverBase = input.tableauCreds.serverUrl.replace(/\/$/, '')
  } else {
    await getSession()  // validate / refresh env-based auth
    serverBase = SERVER_BASE
  }

  const params = buildFilterParams(input.filters ?? [])
  const qs = params.toString()
  const chartUrl = `${serverBase}/views/${input.workbookContentUrl}/${input.viewContentUrl}${qs ? `?${qs}` : ''}`

  return {
    success: true,
    data: {
      chartUrl,
      chartType: input.chartType,
      appliedFilters: input.filters ?? [],
    },
    durationMs: Date.now() - start,
  }
}
