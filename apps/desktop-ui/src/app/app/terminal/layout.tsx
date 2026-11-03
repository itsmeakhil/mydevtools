import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('terminal')

export default function TerminalRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
