import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
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
