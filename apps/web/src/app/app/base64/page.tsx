import { Base64Layout } from '@/components/base64/base64-layout'

export const metadata = {
  title: 'Base64 Encoder / Decoder | MyDevTools',
  description: 'Encode text to Base64 or decode Base64 strings with UTF-8 support.',
}

export default function Base64Page() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <Base64Layout />
    </div>
  )
}
