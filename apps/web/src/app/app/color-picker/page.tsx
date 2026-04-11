import { ColorPickerToolLayout } from '@/components/color-picker-tool/color-picker-tool-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('color-picker')

export default function ColorPickerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <ColorPickerToolLayout />
    </div>
  )
}
