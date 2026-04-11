import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('diff-checker')

const DiffCheckerLayout = dynamic(
  () => import('@/components/diff-checker/diff-checker-layout').then(m => m.DiffCheckerLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function DiffCheckerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <DiffCheckerLayout />
    </div>
  )
}
