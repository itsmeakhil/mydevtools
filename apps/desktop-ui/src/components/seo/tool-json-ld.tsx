import { buildSoftwareApplicationJsonLd } from '@/lib/seo/structured-data'
import { toolsMetadata } from '@/lib/metadata'

export function ToolJsonLd({ slug }: { slug: string | null }) {
  if (!slug || !toolsMetadata[slug]) return null
  const data = buildSoftwareApplicationJsonLd(slug)
  if (!data) return null
  const json = JSON.stringify(data)
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
