import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-formatter')

export default function JsonFormatterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
