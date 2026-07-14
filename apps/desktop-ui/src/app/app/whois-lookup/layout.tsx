import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('whois-lookup')

export default function WhoisLookupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
