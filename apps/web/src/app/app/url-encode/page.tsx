import { UrlEncodeLayout } from '@/components/url-encode/url-encode-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('url-encode')

export default function UrlEncodePage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <UrlEncodeLayout />
    </div>
  )
}
