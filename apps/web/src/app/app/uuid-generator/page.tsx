import { UuidGeneratorLayout } from '@/components/uuid-generator/uuid-generator-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('uuid-generator')

export default function UuidGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <UuidGeneratorLayout />
    </div>
  )
}
