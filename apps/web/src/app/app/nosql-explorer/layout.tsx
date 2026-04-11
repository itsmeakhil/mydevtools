import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('nosql-explorer')

export default function NoSQLExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
