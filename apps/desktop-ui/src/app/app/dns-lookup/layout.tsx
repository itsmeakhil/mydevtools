import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('dns-lookup')

export default function DnsLookupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
