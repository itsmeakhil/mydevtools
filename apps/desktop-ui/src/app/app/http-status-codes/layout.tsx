import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('http-status-codes')

export default function HttpStatusCodesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
