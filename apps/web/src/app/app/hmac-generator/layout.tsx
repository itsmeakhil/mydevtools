import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('hmac-generator')

export default function HmacGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
