import type { MCPToolResult } from '@querylens/shared'
import { getSession, SERVER_BASE } from '../auth.js'

export interface EmbedWorkbookInput {
  clientId: string
  workbookContentUrl: string  // workbook slug, e.g. "SalesAnalysis"
  viewContentUrl?: string     // specific view slug — omit to use default view
  filters?: Record<string, string>  // field → value (equality only, for URL params)
}

export async function embedWorkbook(input: EmbedWorkbookInput): Promise<MCPToolResult> {
  const start = Date.now()
  await getSession()  // validates auth

  const viewPath = input.viewContentUrl
    ? `${input.workbookContentUrl}/${input.viewContentUrl}`
    : input.workbookContentUrl

  const params = new URLSearchParams()
  for (const [field, value] of Object.entries(input.filters ?? {})) {
    params.append(`vf_${field}`, value)
  }
  // :embed=yes suppresses Tableau chrome (toolbar/tabs) for clean embedding
  params.append(':embed', 'yes')

  const embedUrl = `${SERVER_BASE}/views/${viewPath}?${params.toString()}`

  // Week 8: On trial accounts this URL returns a permissions error in the browser.
  // Proper embedding requires Tableau Connected App tokens (trusted authentication).
  // Fix when onboarding a pilot client with full Tableau Cloud access.

  return {
    success: true,
    data: { embedUrl },
    durationMs: Date.now() - start,
  }
}
