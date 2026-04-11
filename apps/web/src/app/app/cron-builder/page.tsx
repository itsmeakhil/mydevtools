import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('cron-builder')

const CronBuilderLayout = dynamic(
  () => import('@/components/cron-builder/cron-builder-layout').then(m => m.CronBuilderLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function CronBuilderPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <CronBuilderLayout />
    </div>
  )
}
