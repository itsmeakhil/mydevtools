import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('unit-converter')

export default function UnitConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
