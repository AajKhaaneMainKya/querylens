// Verifies Tableau auth and lists workbooks on the site.
// Run with: npm run test:tableau (from apps/api)

import { getSession, tableauFetch } from '../mcp/servers/tableau/auth.js'

console.log('=== tableau-mcp auth test ===')
console.log(`Server: ${process.env['TABLEAU_SERVER_URL']}`)
console.log(`Site:   ${process.env['TABLEAU_SITE_ID']}`)
console.log(`User:   ${process.env['TABLEAU_USERNAME']}`)
console.log('')

console.log('[ 1 ] Signing in...')
const session = await getSession()
console.log(`     token  : ${session.token.slice(0, 16)}...`)
console.log(`     siteId : ${session.siteId}`)
console.log(`     valid until: ${new Date(session.expiresAt).toISOString()}`)
console.log('')

interface WorkbooksBody {
  pagination: { pageNumber: number; pageSize: number; totalAvailable: number }
  workbooks: { workbook?: Array<{ id: string; name: string; contentUrl: string }> }
}

console.log('[ 2 ] Listing workbooks...')
const res = await tableauFetch(`/sites/${session.siteId}/workbooks?pageSize=20`)
if (!res.ok) {
  console.error(`FAIL: ${res.status} — ${await res.text()}`)
  process.exit(1)
}

const body = (await res.json()) as WorkbooksBody
const workbooks = body.workbooks.workbook ?? []
console.log(`     total: ${body.pagination.totalAvailable}`)
for (const wb of workbooks) {
  console.log(`     - ${wb.name}  (contentUrl: "${wb.contentUrl}", id: ${wb.id})`)
}
console.log('')

interface ViewsBody {
  pagination: { pageNumber: number; pageSize: number; totalAvailable: number }
  views: { view?: Array<{ id: string; name: string; contentUrl: string; workbook: { id: string; name?: string; contentUrl?: string } }> }
}

console.log('[ 3 ] Listing views...')
const vres = await tableauFetch(`/sites/${session.siteId}/views?pageSize=100`)
if (!vres.ok) {
  console.error(`FAIL: ${vres.status} — ${await vres.text()}`)
  process.exit(1)
}

const vbody = (await vres.json()) as ViewsBody
const views = vbody.views.view ?? []
console.log(`     total: ${vbody.pagination.totalAvailable}`)
for (const v of views) {
  const [workbookContentUrl] = v.contentUrl.split('/sheets/')
  console.log(`     - [${v.id}]  "${v.name}"  workbook: "${workbookContentUrl}"  contentUrl: "${v.contentUrl}"`)
}
console.log('')
console.log('=== done ===')
