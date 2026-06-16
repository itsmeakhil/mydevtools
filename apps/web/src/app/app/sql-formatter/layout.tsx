import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('sql-formatter')

export default function SqlFormatterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
