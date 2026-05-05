import { Router } from 'express'
import type { Request, Response } from 'express'

export const connectRouter = Router()

const API_VERSION = '3.21'

interface SignInResponse {
  credentials: {
    token: string
    site: { id: string; contentUrl: string }
    user: { id: string }
  }
}

connectRouter.post('/', async (req: Request, res: Response) => {
  const { serverUrl, siteId, username, password } = req.body as {
    serverUrl: string
    siteId?: string
    username: string
    password: string
  }

  if (!serverUrl || !username || !password) {
    res.status(400).json({ success: false, error: 'serverUrl, username, and password are required' })
    return
  }

  const base = `${serverUrl.replace(/\/$/, '')}/api/${API_VERSION}`

  try {
    const signInRes = await fetch(`${base}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        credentials: {
          name: username,
          password,
          site: { contentUrl: siteId ?? '' },
        },
      }),
    })

    if (!signInRes.ok) {
      const text = await signInRes.text()
      res.status(401).json({ success: false, error: `Tableau sign-in failed: ${text}` })
      return
    }

    const body = (await signInRes.json()) as SignInResponse
    res.json({
      success: true,
      sessionToken: body.credentials.token,
      siteId: body.credentials.site.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message })
  }
})
