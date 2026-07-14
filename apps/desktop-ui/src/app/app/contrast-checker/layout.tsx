import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('contrast-checker')

export default function ContrastCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
