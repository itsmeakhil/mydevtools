import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('data-explorer')

export default function DataExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
