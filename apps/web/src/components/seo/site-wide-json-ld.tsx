import { buildWebSiteGraphJsonLd } from '@/lib/seo/structured-data'

/** WebSite + Organization + ItemList of all tools — in root layout for crawlers & AI. */
export function SiteWideJsonLd() {
  const json = JSON.stringify(buildWebSiteGraphJsonLd())
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
