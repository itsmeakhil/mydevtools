import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('code-screenshot')

export default function CodeScreenshotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
