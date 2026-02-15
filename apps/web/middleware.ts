import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { locales, defaultLocale } from '@/i18n/config'

const intlMiddleware = createIntlMiddleware(routing)

// Protected route segments (after locale prefix)
const PROTECTED_SEGMENTS = [
  '/dashboard',
  '/lesson',
  '/history',
  '/flashcards',
  '/conversation',
  '/analysis',
  '/learning-path',
  '/report',
]

function getPathnameWithoutLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(`/${locale}`.length) || '/'
    }
  }
  return pathname
}

function getLocaleFromPathname(pathname: string): string | null {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes, auth callbacks, static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/v1/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Run next-intl middleware first (handles locale detection + redirect)
  const intlResponse = intlMiddleware(request)

  // Determine actual pathname after locale handling
  const resolvedPathname = getPathnameWithoutLocale(pathname)

  // Check if the route is protected
  const isProtected = PROTECTED_SEGMENTS.some(
    (seg) => resolvedPathname.startsWith(seg)
  )

  if (!isProtected) {
    return intlResponse
  }

  // For protected routes, check auth
  const response = intlResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const locale = getLocaleFromPathname(pathname) || defaultLocale
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    '/((?!api|auth|v1|_next|.*\\..*).*)',
  ],
}
