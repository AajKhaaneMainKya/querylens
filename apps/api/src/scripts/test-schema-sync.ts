// Tests SchemaAgent sync mode end-to-end:
//   tableau-mcp server (port 3002) → MCPRouter → SchemaAgent → Supabase
//
// Prerequisites:
//   1. npm run tableau-mcp   (in a separate terminal — must be running)
//   2. npm run test:schema   (this script)

import { supabase } from '../lib/supabase.js'
import { SchemaAgent } from '../agents/schema-agent.js'

console.log('=== SchemaAgent sync test ===')
console.log('')

// 1. Upsert a dev pilot client (idempotent — safe to re-run)
console.log('[ 1 ] Ensuring dev client exists in Supabase...')
const { data: client, error: clientErr } = await supabase
  .from('clients')
  .upsert(
    {
      name: 'QueryLens Dev',
      subdomain: 'dev',
      plan_tier: 'pilot',
      tableau_server_url: process.env['TABLEAU_SERVER_URL'] ?? 'https://prod-in-a.online.tableau.com',
      tableau_site_id: process.env['TABLEAU_SITE_ID'] ?? 'rshivs1295-f33207fd0a',
      tableau_pat_name: process.env['TABLEAU_USERNAME'] ?? '',
      tableau_pat_secret: process.env['TABLEAU_PASSWORD'] ?? '',
    },
    { onConflict: 'subdomain' }
  )
  .select('id, name')
  .single()

if (clientErr || !client) {
  console.error('FAIL — could not upsert dev client:', clientErr?.message)
  process.exit(1)
}
console.log(`     id:   ${client.id}`)
console.log(`     name: ${client.name}`)
console.log('')

// 2. Run SchemaAgent in sync mode
console.log('[ 2 ] Running SchemaAgent sync (calls tableau-mcp on :3002)...')
const agent = new SchemaAgent()
const result = await agent.run('', { clientId: client.id, conversationId: 'test', sessionMessages: [] }, 'sync')

if (!result.success) {
  console.error('FAIL —', result.errorMessage)
  process.exit(1)
}
console.log('    ', result.data?.description)
console.log('')

// 3. Read back from Supabase to confirm
console.log('[ 3 ] Verifying rows in client_schemas...')
const { data: schemas, error: schemasErr } = await supabase
  .from('client_schemas')
  .select('workbook_name, schema_json, last_synced_at')
  .eq('client_id', client.id)
  .order('workbook_name')

if (schemasErr) {
  console.error('FAIL —', schemasErr.message)
  process.exit(1)
}

for (const row of schemas ?? []) {
  const json = row.schema_json as { views: unknown[] }
  console.log(`     ${row.workbook_name}: ${json.views.length} view(s)  (synced ${row.last_synced_at})`)
}

console.log('')
console.log('=== done ===')
