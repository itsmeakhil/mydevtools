import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('gitignore-generator')

export default function GitignoreGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
