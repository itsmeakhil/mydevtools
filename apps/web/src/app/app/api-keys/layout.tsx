import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('api-keys')

export default function ApiKeysLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
