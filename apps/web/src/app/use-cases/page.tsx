import type { Metadata } from 'next'
import { MarketingSeoPage } from '@/components/marketing-seo-page'
import { getPlatformSeoPage } from '@/lib/seo/platform-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const page = getPlatformSeoPage('use-cases')
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(page?.title ?? 'MyDevTools')}&description=${encodeURIComponent(page?.description ?? 'Online developer tools')}`

export const metadata: Metadata = {
  title: page?.title,
  description: page?.description,
  alternates: { canonical: `${baseUrl}/use-cases` },
  openGraph: {
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    url: `${baseUrl}/use-cases`,
    siteName: 'MyDevTools',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: page?.title ?? 'MyDevTools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    images: [ogImage],
  },
}

export default function UseCasesPage() {
  if (!page) return null
  return <MarketingSeoPage page={page} />
}
