import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('webhook-tester')

export default function WebhookTesterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
