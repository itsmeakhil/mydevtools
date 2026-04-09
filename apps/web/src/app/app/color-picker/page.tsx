import { ColorPickerToolLayout } from '@/components/color-picker-tool/color-picker-tool-layout'

export const metadata = {
  title: 'Color Picker & Converter | MyDevTools',
  description:
    'Pick colors, convert HEX, RGB, and HSL, and explore palettes: shades, complementary, triadic, and more.',
}

export default function ColorPickerPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <ColorPickerToolLayout />
    </div>
  )
}
