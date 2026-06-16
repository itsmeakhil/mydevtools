import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('secret-api-key-generator')

export default function SecretApiKeyGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
