import { CronBuilderLayout } from '@/components/cron-builder/cron-builder-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('cron-builder')

export default function CronBuilderPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <CronBuilderLayout />
    </div>
  )
}
