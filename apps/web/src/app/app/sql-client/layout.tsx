import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('sql-client')

export default function SqlClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
