import { DiffCheckerLayout } from '@/components/diff-checker/diff-checker-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('diff-checker')

export default function DiffCheckerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <DiffCheckerLayout />
    </div>
  )
}
