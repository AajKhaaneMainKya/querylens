import type { MCPToolResult } from '@querylens/shared'
import { getSession, API_BASE } from '../../tableau/auth.js'

const API_VERSION = '3.21'

export interface ToPdfInput {
  viewId: string
  tableauCreds?: { serverUrl: string; siteId: string; token: string }
}

export async function toPdf(input: ToPdfInput): Promise<MCPToolResult> {
  const start = Date.now()

  let token: string
  let siteId: string
  let apiBase: string

  if (input.tableauCreds) {
    token = input.tableauCreds.token
    siteId = input.tableauCreds.siteId
    apiBase = `${input.tableauCreds.serverUrl.replace(/\/$/, '')}/api/${API_VERSION}`
  } else {
    const session = await getSession()
    token = session.token
    siteId = session.siteId
    apiBase = API_BASE
  }

  const response = await fetch(
    `${apiBase}/sites/${siteId}/views/${input.viewId}/pdf`,
    { headers: { 'X-Tableau-Auth': token } },
  )

  if (!response.ok) {
    throw new Error(
      `Tableau PDF download failed (${response.status}): ${await response.text()}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer).toString('base64')

  return {
    success: true,
    data: { buffer, mimeType: 'application/pdf', filename: 'export.pdf' },
    durationMs: Date.now() - start,
  }
}
