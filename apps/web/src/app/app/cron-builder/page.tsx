import { CronBuilderLayout } from '@/components/cron-builder/cron-builder-layout'

export const metadata = {
  title: 'Cron Expression Builder | MyDevTools',
  description:
    'Build and parse cron schedules with a visual field editor, presets, plain-language output, and next run times.',
}

export default function CronBuilderPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <CronBuilderLayout />
    </div>
  )
}
