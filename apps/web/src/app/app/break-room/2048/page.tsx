import { Game2048LayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('break-room/2048')

export default function Game2048Page() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <Game2048LayoutLazy />
    </div>
  )
}
