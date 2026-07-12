import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-to-code')

export default function JsonToCodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
