import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('color-picker')

const ColorPickerToolLayout = dynamic(
  () => import('@/components/color-picker-tool/color-picker-tool-layout').then(m => m.ColorPickerToolLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function ColorPickerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <ColorPickerToolLayout />
    </div>
  )
}
