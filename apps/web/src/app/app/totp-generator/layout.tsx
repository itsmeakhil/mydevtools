import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('totp-generator')

export default function TotpGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
