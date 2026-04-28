// Tests QueryAgent end-to-end:
//   Supabase (schema) → Mistral (NLP) → MCPRouter → tableau-mcp (apply-filters)
//
// Prerequisites:
//   1. npm run tableau-mcp   (in a separate terminal — must be running on :3002)
//   2. npm run test:query    (this script)

import { supabase } from '../lib/supabase.js'
import { QueryAgent } from '../agents/query-agent.js'

const QUERY = 'Show me sales by region for 2023 as a bar chart'

console.log('=== QueryAgent test ===')
console.log(`Query: "${QUERY}"`)
console.log('')

// 1. Look up the dev client
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

// 2. Run QueryAgent
console.log('[ 1 ] Running QueryAgent...')
const agent = new QueryAgent()
const result = await agent.run(QUERY, {
  clientId: client.id,
  conversationId: 'test',
  sessionMessages: [],
})

console.log('')
if (!result.success) {
  console.error('FAIL —', result.errorMessage)
  process.exit(1)
}

if (result.clarifyQuestion) {
  console.log('[ clarify ]', result.clarifyQuestion)
} else {
  console.log('[ chartUrl ]       ', result.data?.chartUrl)
  console.log('[ chartType ]      ', result.data?.chartType)
  console.log('[ appliedFilters ] ', JSON.stringify(result.data?.appliedFilters, null, 2))
}

console.log('')
console.log('=== done ===')
