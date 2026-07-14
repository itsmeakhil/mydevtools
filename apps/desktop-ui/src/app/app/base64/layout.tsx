import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('base64')

export default function Base64Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
