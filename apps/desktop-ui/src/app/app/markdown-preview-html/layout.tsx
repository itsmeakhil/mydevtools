import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('markdown-preview-html')

export default function MarkdownPreviewHtmlLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
