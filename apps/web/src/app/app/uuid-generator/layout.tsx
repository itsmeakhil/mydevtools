import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('uuid-generator')

export default function UuidGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
