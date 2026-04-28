// Tests OrchestratorAgent end-to-end:
//   Groq (classify_intent) → QueryAgent → Groq (build_tableau_filters) → MCPRouter → tableau-mcp
//
// Prerequisites:
//   1. npm run tableau-mcp   (separate terminal — must be running on :3002)
//   2. Run this SQL in Supabase to enable tableau-mcp for the dev client:
//      INSERT INTO client_mcps (client_id, mcp_name, enabled)
//      SELECT id, 'tableau-mcp', true FROM clients WHERE subdomain = 'dev'
//      ON CONFLICT (client_id, mcp_name) DO UPDATE SET enabled = true;
//   3. npm run test:orchestrator

import { supabase } from '../lib/supabase.js'
import { OrchestratorAgent } from '../agents/orchestrator.js'

const QUERIES = [
  'Show me sales by region for 2023 as a bar chart',
  'What data do you have available?',
]

console.log('=== OrchestratorAgent test ===')
console.log('')

const { data: client, error: clientErr } = await supabase
  .from('clients')
  .select('id, name')
  .eq('subdomain', 'dev')
  .single()

if (clientErr || !client) {
  console.error('FAIL — dev client not found. Run test:schema first.')
  process.exit(1)
}
console.log(`[ client ]  ${client.name}  (${client.id})`)
console.log('')

const agent = new OrchestratorAgent()

for (const query of QUERIES) {
  console.log(`[ query ]  "${query}"`)
  const result = await agent.run(query, {
    clientId: client.id,
    conversationId: 'test',
    sessionMessages: [],
  })

  console.log(`[ intent ]       `, result.intent)
  console.log(`[ success ]      `, result.success)
  if (result.clarifyQuestion) console.log(`[ clarify ]      `, result.clarifyQuestion)
  if (result.data)            console.log(`[ data ]         `, JSON.stringify(result.data, null, 2))
  if (result.errorMessage)    console.log(`[ error ]        `, result.errorMessage)
  console.log('')
}

console.log('=== done ===')
