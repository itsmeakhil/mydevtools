import { MimeTypeLookupLayout } from '@/components/mime-type-lookup/mime-type-lookup-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('mime-type-lookup')

export default function MimeTypeLookupPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <MimeTypeLookupLayout />
    </div>
  )
}

