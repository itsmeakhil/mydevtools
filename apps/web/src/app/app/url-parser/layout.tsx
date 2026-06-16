import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('url-parser')

export default function UrlParserLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
