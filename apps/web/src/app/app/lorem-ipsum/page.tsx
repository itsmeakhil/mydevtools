import { LoremIpsumLayout } from '@/components/lorem-ipsum/lorem-ipsum-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('lorem-ipsum')

export default function LoremIpsumPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <LoremIpsumLayout />
    </div>
  )
}
