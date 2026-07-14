import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('user-agent-parser')

export default function UserAgentParserLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
