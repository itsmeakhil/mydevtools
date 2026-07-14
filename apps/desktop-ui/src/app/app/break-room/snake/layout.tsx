import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/snake')

export default function BreakRoomSnakeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
