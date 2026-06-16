import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('api-client')

export default function ApiClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
