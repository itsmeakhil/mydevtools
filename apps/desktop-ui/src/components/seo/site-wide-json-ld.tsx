import { buildWebSiteGraphJsonLd } from '@/lib/seo/structured-data'

/** WebSite + Organization + ItemList of all tools — in root head for crawlers & AI. */
export function SiteWideJsonLd() {
  const json = JSON.stringify(buildWebSiteGraphJsonLd())
  return (
    <script
      id="sitewide-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
