import { generateToolMetadata } from '@/lib/metadata'
import { GitignoreLayout } from '@/components/gitignore-generator/gitignore-layout'

export function generateMetadata() {
  return generateToolMetadata('gitignore-generator')
}

export default function GitignoreGeneratorPage() {
  return <GitignoreLayout />
}
