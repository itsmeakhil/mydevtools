import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('timestamp-converter')

export default function TimestampConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
