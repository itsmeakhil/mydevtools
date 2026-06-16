import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/minesweeper')

export default function BreakRoomMinesweeperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
