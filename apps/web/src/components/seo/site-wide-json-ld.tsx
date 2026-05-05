import Script from 'next/script'
import { buildWebSiteGraphJsonLd } from '@/lib/seo/structured-data'

/** WebSite + Organization + ItemList of all tools — in root layout for crawlers & AI. */
export function SiteWideJsonLd() {
  const json = JSON.stringify(buildWebSiteGraphJsonLd())
  return (
    <Script
      id="sitewide-jsonld"
      type="application/ld+json"
      strategy="beforeInteractive"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
