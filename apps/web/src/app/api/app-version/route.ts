import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Returns the build id baked in at deploy time. Used to detect when a newer
 * deployment is live while the user still has an older client bundle in memory.
 */
export function GET() {
  const buildId = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? 'unknown'
  return NextResponse.json(
    { buildId },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    }
  )
}
