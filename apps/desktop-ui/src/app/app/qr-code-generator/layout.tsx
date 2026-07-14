import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('qr-code-generator')

export default function QrCodeGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
