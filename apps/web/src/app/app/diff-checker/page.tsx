import { DiffCheckerLayout } from '@/components/diff-checker/diff-checker-layout'

export const metadata = {
  title: 'Diff checker | MyDevTools',
  description:
    'Side-by-side line diff of two texts with highlighted additions and removals in the browser.',
}

export default function DiffCheckerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <DiffCheckerLayout />
    </div>
  )
}
