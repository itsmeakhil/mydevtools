import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('string-case-converter')

export default function StringCaseConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
