import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('sql-formatter')

const SqlFormatterLayout = dynamic(
  () => import('@/components/sql-formatter/sql-formatter-layout').then(m => m.SqlFormatterLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function SqlFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <SqlFormatterLayout />
    </div>
  )
}
