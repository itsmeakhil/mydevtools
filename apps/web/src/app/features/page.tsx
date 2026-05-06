import type { Metadata } from 'next'
import { MarketingSeoPage } from '@/components/marketing-seo-page'
import { getPlatformSeoPage } from '@/lib/seo/platform-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const page = getPlatformSeoPage('features')

export const metadata: Metadata = {
  title: page?.title,
  description: page?.description,
  keywords: page?.keywords,
  alternates: { canonical: `${baseUrl}/features` },
  openGraph: {
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    url: `${baseUrl}/features`,
    siteName: 'MyDevTools',
    type: 'website',
  },
}

export default function FeaturesPage() {
  if (!page) return null
  return <MarketingSeoPage page={page} />
}
