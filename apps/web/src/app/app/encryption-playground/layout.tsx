import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('encryption-playground')

export default function EncryptionPlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
