import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance gate: when MAINTENANCE_MODE=true, serve /maintenance for every
  // page request (URL preserved via rewrite). Off by default — zero overhead.
  // ponytail: env flag, no admin UI; flip the var and redeploy to toggle.
  if (process.env.MAINTENANCE_MODE === 'true' && !pathname.startsWith('/maintenance')) {
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    return NextResponse.rewrite(url, {
      status: 503,
      headers: { 'Retry-After': '3600' },
    })
  }

  // Forward pathname to server components (e.g. JSON-LD on /app/*) without
  // exposing it as a public response header.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-mdt-pathname', pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

// Run on all page routes (skip Next internals, static assets, files with an extension).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
}
