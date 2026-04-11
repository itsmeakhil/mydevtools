import { SqlFormatterLayoutLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('sql-formatter')

export default function SqlFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <SqlFormatterLayoutLazy />
    </div>
  )
}
