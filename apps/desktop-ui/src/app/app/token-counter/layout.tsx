import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('token-counter')

export default function TokenCounterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
