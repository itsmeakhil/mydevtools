import { UrlParserLayout } from '@/components/url-parser/url-parser-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('url-parser')

export default function UrlParserPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <UrlParserLayout />
    </div>
  )
}

