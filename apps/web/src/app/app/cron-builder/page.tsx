import { CronBuilderLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('cron-builder')

export default function CronBuilderPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <CronBuilderLayoutLazy />
    </div>
  )
}
