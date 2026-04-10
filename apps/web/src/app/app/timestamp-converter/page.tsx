import { TimestampConverterLayout } from '@/components/timestamp-converter/timestamp-converter-layout'

export const metadata = {
  title: 'Timestamp Converter | MyDevTools',
  description:
    'Convert Unix time, ISO-8601, and date strings. View UTC, local ISO, relative time, and copy any field.',
}

export default function TimestampConverterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <TimestampConverterLayout />
    </div>
  )
}
