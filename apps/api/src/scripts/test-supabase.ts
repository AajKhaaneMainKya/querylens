import { supabase } from '../lib/supabase.js'

console.log('=== Supabase connection test ===')

const { data, error } = await supabase.from('waitlist').select('count').limit(1)

if (error) {
  console.error('FAIL:', error.message)
  process.exit(1)
}

console.log('OK — waitlist table reachable, response:', data)
