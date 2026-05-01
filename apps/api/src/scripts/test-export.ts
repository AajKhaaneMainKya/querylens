// Tests ExportAgent end-to-end:
//   export-mcp (Puppeteer → PNG) → Supabase Storage → signed URL
//
// Prerequisites:
//   1. npm run export-mcp   (separate terminal — must be running on :3003)
//   2. Supabase Storage bucket 'exports' must exist (private)
//   3. client_mcps must have export-mcp enabled for dev client:
//      INSERT INTO client_mcps (client_id, mcp_name, enabled)
//      SELECT id, 'export-mcp', true FROM clients WHERE subdomain = 'dev'
//      ON CONFLICT (client_id, mcp_name) DO UPDATE SET enabled = true;

import { supabase } from '../lib/supabase.js'
import { ExportAgent } from '../agents/export-agent.js'

const VIEW_URL = 'https://prod-in-a.online.tableau.com/views/Superstore/Overview'

console.log('=== ExportAgent test ===')
console.log(`View URL: ${VIEW_URL}`)
console.log('')

const { data: client, error: clientErr } = await supabase
  .from('clients')
  .select('id, name')
  .eq('subdomain', 'dev')
  .single()

if (clientErr || !client) {
  console.error('FAIL — dev client not found.')
  process.exit(1)
}
console.log(`[ client ]  ${client.name}  (${client.id})`)
console.log('')

const agent = new ExportAgent()

console.log('[ 1 ] Exporting as PNG (Puppeteer → Supabase Storage)...')
const result = await agent.run(
  { viewUrl: VIEW_URL, format: 'png' },
  { clientId: client.id, conversationId: 'test', sessionMessages: [] },
)

console.log('')
if (!result.success) {
  console.error('FAIL —', result.errorMessage)
  process.exit(1)
}

console.log('[ downloadUrl ] ', result.data?.downloadUrl)
console.log('[ format ]      ', result.data?.format)
console.log('[ expiresAt ]   ', result.data?.expiresAt)
console.log('')
console.log('=== done ===')
