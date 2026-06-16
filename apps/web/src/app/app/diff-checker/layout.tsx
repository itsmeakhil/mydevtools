import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('diff-checker')

export default function DiffCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
