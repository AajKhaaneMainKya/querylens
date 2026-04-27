// Tableau REST API auth — username/password sign-in with cached token.
// All tableau-mcp tools import getSession() and tableauFetch() from here.

const SERVER_URL = (process.env['TABLEAU_SERVER_URL'] ?? '').replace(/\/$/, '')
const SITE_ID = process.env['TABLEAU_SITE_ID'] ?? ''
const USERNAME = process.env['TABLEAU_USERNAME'] ?? ''
const PASSWORD = process.env['TABLEAU_PASSWORD'] ?? ''

export const API_VERSION = '3.21'
export const API_BASE = `${SERVER_URL}/api/${API_VERSION}`
export const SERVER_BASE = SERVER_URL

export interface Session {
  token: string
  siteId: string  // LUID returned by Tableau (not the contentUrl slug)
  expiresAt: number
}

let cached: Session | null = null

interface SignInResponse {
  credentials: {
    token: string
    site: { id: string; contentUrl: string }
    user: { id: string }
    estimatedTimeToExpiration: string
  }
}

export async function getSession(): Promise<Session> {
  // Refresh 5 min before expiry so tools never hit a stale token mid-request
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached

  const res = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      credentials: {
        name: USERNAME,
        password: PASSWORD,
        site: { contentUrl: SITE_ID },
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Tableau sign-in failed (${res.status}): ${await res.text()}`)
  }

  const body = (await res.json()) as SignInResponse
  // Tableau tokens last 4 h by default; cache for 3.5 h to be safe
  cached = {
    token: body.credentials.token,
    siteId: body.credentials.site.id,
    expiresAt: Date.now() + 3.5 * 60 * 60 * 1000,
  }
  return cached
}

// Authenticated wrapper around fetch — auto-injects X-Tableau-Auth and JSON headers.
export async function tableauFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { token } = await getSession()
  const { headers: initHeaders, ...rest } = init
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Tableau-Auth': token,
      ...(initHeaders as Record<string, string> | undefined),
    },
  })
}
