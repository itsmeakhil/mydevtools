import { GraphqlFormatterLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('graphql-formatter')

export default function GraphqlFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <GraphqlFormatterLayoutLazy />
    </div>
  )
}
