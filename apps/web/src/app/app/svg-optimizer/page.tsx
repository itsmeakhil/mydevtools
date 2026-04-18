import { SvgOptimizerLayout } from '@/components/svg-optimizer/svg-optimizer-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('svg-optimizer')

export default function SvgOptimizerPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <SvgOptimizerLayout />
    </div>
  )
}
