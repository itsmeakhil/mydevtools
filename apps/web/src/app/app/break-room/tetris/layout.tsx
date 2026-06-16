import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/tetris')

export default function BreakRoomTetrisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
