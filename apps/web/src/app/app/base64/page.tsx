import { Base64Layout } from '@/components/base64/base64-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('base64')

export default function Base64Page() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <Base64Layout />
    </div>
  )
}
