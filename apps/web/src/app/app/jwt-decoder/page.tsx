import { JwtDecoderLayout } from '@/components/jwt-decoder/jwt-decoder-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('jwt-decoder')

export default function JwtDecoderPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <JwtDecoderLayout />
    </div>
  )
}
