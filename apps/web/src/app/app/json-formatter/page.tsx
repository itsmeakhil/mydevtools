import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-formatter')

const JsonFormatterLayout = dynamic(
  () => import('@/components/json-formatter/json-formatter-layout').then(m => m.JsonFormatterLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function JsonFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JsonFormatterLayout />
    </div>
  )
}
