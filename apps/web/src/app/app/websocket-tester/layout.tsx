import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('websocket-tester')

export default function WebsocketTesterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
