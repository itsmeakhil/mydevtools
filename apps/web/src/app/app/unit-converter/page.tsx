import { UnitConverterLayout } from '@/components/unit-converter/unit-converter-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('unit-converter')

export default function UnitConverterPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <UnitConverterLayout />
    </div>
  )
}
