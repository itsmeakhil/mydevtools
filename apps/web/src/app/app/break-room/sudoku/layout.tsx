import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/sudoku')

export default function BreakRoomSudokuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
