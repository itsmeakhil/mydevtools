import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('curl-to-code')

export default function CurlToCodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
