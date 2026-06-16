import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('url-shortener')

export default function UrlShortenerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
