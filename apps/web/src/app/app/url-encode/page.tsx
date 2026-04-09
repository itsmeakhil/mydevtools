import { UrlEncodeLayout } from '@/components/url-encode/url-encode-layout'

export const metadata = {
  title: 'URL Encoder / Decoder | MyDevTools',
  description:
    'Percent-encode or decode strings with UTF-8 support using standard URI component encoding.',
}

export default function UrlEncodePage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <UrlEncodeLayout />
    </div>
  )
}
