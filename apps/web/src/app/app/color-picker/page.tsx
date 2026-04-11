import { ColorPickerToolLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('color-picker')

export default function ColorPickerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <ColorPickerToolLayoutLazy />
    </div>
  )
}
