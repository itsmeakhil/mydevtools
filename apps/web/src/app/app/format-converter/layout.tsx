import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('format-converter')

export default function FormatConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
