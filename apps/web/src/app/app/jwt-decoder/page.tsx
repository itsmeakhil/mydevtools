import { JwtDecoderLayout } from '@/components/jwt-decoder/jwt-decoder-layout'

export const metadata = {
  title: 'JWT Decoder | MyDevTools',
  description:
    'Decode JWT header and payload, read exp / iat / nbf times. Client-side only; signature not verified.',
}

export default function JwtDecoderPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JwtDecoderLayout />
    </div>
  )
}
