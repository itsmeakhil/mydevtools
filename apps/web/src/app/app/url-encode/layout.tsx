import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('url-encode')

export default function UrlEncodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
