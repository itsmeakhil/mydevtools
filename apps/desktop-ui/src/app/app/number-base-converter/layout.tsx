import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('number-base-converter')

export default function NumberBaseConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
