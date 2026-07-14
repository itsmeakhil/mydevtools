import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('regex-tester')

export default function RegexTesterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
