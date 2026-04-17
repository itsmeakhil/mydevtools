import { UserAgentParserLayout } from '@/components/user-agent-parser/user-agent-parser-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('user-agent-parser')

export default function UserAgentParserPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <UserAgentParserLayout />
    </div>
  )
}

