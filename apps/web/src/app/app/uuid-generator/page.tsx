import { UuidGeneratorLayout } from '@/components/uuid-generator/uuid-generator-layout'

export const metadata = {
  title: 'UUID / ULID Generator | MyDevTools',
  description:
    'Generate UUID v1, v3, v4, v5, v6, v7, or ULIDs with namespace options and bulk export.',
}

export default function UuidGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <UuidGeneratorLayout />
    </div>
  )
}
