import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/2048')

export default function BreakRoom2048Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
