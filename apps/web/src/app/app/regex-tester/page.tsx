import { RegexTesterLayout } from '@/components/regex-tester/regex-tester-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('regex-tester')

export default function RegexTesterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <RegexTesterLayout />
    </div>
  )
}
