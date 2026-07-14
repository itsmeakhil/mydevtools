import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-diff')

export default function JsonDiffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
