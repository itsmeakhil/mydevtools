import { ImageToBase64Layout } from '@/components/image-to-base64/image-to-base64-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('image-to-base64')

export default function ImageToBase64Page() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <ImageToBase64Layout />
    </div>
  )
}
