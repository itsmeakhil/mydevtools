import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('line-sort-dedupe')

export default function LineSortDedupeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
