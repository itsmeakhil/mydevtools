import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('string-inspector')

export default function StringInspectorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
