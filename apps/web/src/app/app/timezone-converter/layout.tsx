import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('timezone-converter')

export default function TimezoneConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
