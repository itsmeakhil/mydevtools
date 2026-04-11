import { DiffCheckerLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('diff-checker')

export default function DiffCheckerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <DiffCheckerLayoutLazy />
    </div>
  )
}
