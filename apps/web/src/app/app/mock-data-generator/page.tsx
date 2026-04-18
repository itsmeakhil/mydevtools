import { MockDataGeneratorLayout } from '@/components/mock-data-generator/mock-data-generator-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('mock-data-generator')

export default function MockDataGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <MockDataGeneratorLayout />
    </div>
  )
}
