import { JsonFormatterLayout } from '@/components/json-formatter/json-formatter-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-formatter')

export default function JsonFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JsonFormatterLayout />
    </div>
  )
}
