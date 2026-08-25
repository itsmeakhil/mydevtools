import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('secure-files')

export default function SecureFilesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
