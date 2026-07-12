import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('escape-encode')

export default function EscapeEncodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
