import { createClient } from '@supabase/supabase-js'

const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

// Anon client — safe for browser use, subject to Row Level Security.
export const supabase = createClient(url, key)
