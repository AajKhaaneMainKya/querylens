import { chat, chatWithTools, chatJSON } from '../services/llm.js'

console.log('=== QueryLens LLM adapter test ===')
console.log(`Ollama: ${process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'}`)
console.log(`Model:  ${process.env['OLLAMA_MODEL'] ?? 'mistral'}`)
console.log('')

// Test 1: plain chat
console.log('[ 1 ] Plain chat...')
const r1 = await chat([
  { role: 'user', content: 'Reply with exactly three words: adapter is working' },
])
console.log('     content   :', r1.content)
console.log('     toolCalls :', r1.toolCalls)
console.log('')

// Test 2: chat with tools
console.log('[ 2 ] Chat with tools...')
const r2 = await chatWithTools(
  [{ role: 'user', content: 'What is the capital of France? Use the get_capital tool.' }],
  [
    {
      name: 'get_capital',
      description: 'Returns the capital city of a given country.',
      parameters: {
        type: 'object',
        properties: {
          country: { type: 'string', description: 'Country name' },
          capital: { type: 'string', description: 'Capital city' },
        },
        required: ['country', 'capital'],
      },
    },
  ],
)
console.log('     content   :', r2.content)
console.log('     toolCalls :', JSON.stringify(r2.toolCalls, null, 6))
console.log('')

// Test 3: chatJSON — valid response path
console.log('[ 3 ] chatJSON (valid path)...')
const r3 = await chatJSON<{ city: string; country: string }>([
  {
    role: 'system',
    content: 'You are a JSON API. Return only raw JSON — no markdown, no prose.',
  },
  {
    role: 'user',
    content: 'Return a JSON object with keys "city" and "country" for the capital of France.',
  },
])
console.log('     parsed    :', r3)
console.log('')

// Test 4: chatJSON — retry path (deliberately ask for JSON after a prose preamble)
console.log('[ 4 ] chatJSON (retry path — model asked for prose first)...')
const r4 = await chatJSON<{ status: string }>([
  {
    role: 'user',
    content:
      'First explain what JSON is in one sentence, then return: {"status":"ok"}',
  },
])
console.log('     parsed    :', r4)
console.log('')

console.log('=== done ===')
