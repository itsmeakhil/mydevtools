import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('redis-commander')

export default function RedisCommanderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
