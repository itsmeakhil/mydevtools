import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('certificate-pem-decoder')

export default function CertificatePemDecoderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
