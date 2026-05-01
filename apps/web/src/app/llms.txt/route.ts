import { buildLlmsTxtBody } from '@/lib/seo/structured-data'

export const runtime = 'edge';

export function GET() {
  return new Response(buildLlmsTxtBody(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
