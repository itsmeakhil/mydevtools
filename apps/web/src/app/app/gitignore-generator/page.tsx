import { generateToolMetadata } from '@/lib/metadata'
import { GitignoreLayout } from '@/components/gitignore-generator/gitignore-layout'

export function generateMetadata() {
  return generateToolMetadata('gitignore-generator')
}

export default function GitignoreGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <GitignoreLayout />
    </div>
  )
}
