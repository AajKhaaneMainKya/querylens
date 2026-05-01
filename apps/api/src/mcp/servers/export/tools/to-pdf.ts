import puppeteer from 'puppeteer'
import type { MCPToolResult } from '@querylens/shared'
import { getSession, SERVER_BASE } from '../../tableau/auth.js'

export interface ToPdfInput {
  viewUrl: string
  width?: number
  height?: number
}

export async function toPdf(input: ToPdfInput): Promise<MCPToolResult> {
  const start = Date.now()
  const { viewUrl, width = 1280, height = 800 } = input

  const { token } = await getSession()
  const domain = new URL(SERVER_BASE).hostname

  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height })

    // Navigate to the base domain first so Puppeteer has a page context
    // on which to set the cookie — cookies can only be set for the current
    // origin, so we must visit the domain before calling setCookie.
    await page.goto(SERVER_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })

    await page.setCookie({
      name: 'workgroup_session_id',
      value: token,
      domain,
      path: '/',
      httpOnly: true,
      secure: true,
    })

    // Now navigate to the actual view — cookie is already set on the domain
    await page.goto(viewUrl, { waitUntil: 'networkidle2', timeout: 60000 })

    const pdf = await page.pdf({
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
    })
    const buffer = Buffer.from(pdf).toString('base64')

    return {
      success: true,
      data: { buffer, mimeType: 'application/pdf', filename: 'export.pdf' },
      durationMs: Date.now() - start,
    }
  } finally {
    await browser.close()
  }
}
