import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('mock-data-generator')

export default function MockDataGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
