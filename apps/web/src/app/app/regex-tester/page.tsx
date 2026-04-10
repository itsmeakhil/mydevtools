import { RegexTesterLayout } from '@/components/regex-tester/regex-tester-layout'

export const metadata = {
  title: 'Regex Tester | MyDevTools',
  description:
    'Test JavaScript regular expressions with live match highlighting, flags, and match counts in the browser.',
}

export default function RegexTesterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <RegexTesterLayout />
    </div>
  )
}
