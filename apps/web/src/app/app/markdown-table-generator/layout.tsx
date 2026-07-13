import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('markdown-table-generator')

export default function MarkdownTableGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
