import { TimestampConverterLayout } from '@/components/timestamp-converter/timestamp-converter-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('timestamp-converter')

export default function TimestampConverterPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <TimestampConverterLayout />
    </div>
  )
}
