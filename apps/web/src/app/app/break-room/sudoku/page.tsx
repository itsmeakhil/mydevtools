import { SudokuLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
export default function SudokuPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4 overflow-y-auto">
      <SudokuLayoutLazy />
    </div>
  )
}
