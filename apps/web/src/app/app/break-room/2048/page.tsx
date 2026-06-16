import { Game2048LayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
export default function Game2048Page() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <Game2048LayoutLazy />
    </div>
  )
}
