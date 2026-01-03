import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    // Get user information
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: user.user_metadata.avatar_url,
          provider: user.app_metadata.provider || 'google'
        })
      }
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
