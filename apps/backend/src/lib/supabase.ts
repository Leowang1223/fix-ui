import { createClient } from '@supabase/supabase-js'

// Debug: Log all environment variables (remove in production)
console.log('🔍 Environment Variables Check:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY)
console.log('All env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('GEMINI')))

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function verifySupabaseToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Error('Invalid token')
  }
  return user
}
