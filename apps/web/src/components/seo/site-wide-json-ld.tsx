import { buildWebSiteGraphJsonLd } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/json-ld'

/** WebSite + Organization + ItemList of all tools — in root head for crawlers & AI. */
export function SiteWideJsonLd() {
  return <JsonLd id="sitewide-jsonld" data={buildWebSiteGraphJsonLd()} />
}
