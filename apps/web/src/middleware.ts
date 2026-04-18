import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Forward pathname to server components (e.g. JSON-LD on /app/*) without exposing
 * it as a public response header.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-mdt-pathname', request.nextUrl.pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/app/:path*'],
}
