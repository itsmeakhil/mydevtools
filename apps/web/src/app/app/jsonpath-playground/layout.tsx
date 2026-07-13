import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('jsonpath-playground')

export default function JsonpathPlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
