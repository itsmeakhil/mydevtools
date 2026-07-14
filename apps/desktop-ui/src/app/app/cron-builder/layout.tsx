import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('cron-builder')

export default function CronBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
