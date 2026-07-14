import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('snippet-manager')

export default function SnippetManagerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
