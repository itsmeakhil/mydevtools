import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('favicon-generator')

export default function FaviconGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
