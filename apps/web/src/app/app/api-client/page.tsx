import { ApiClientLazy } from '@/components/app-tools/client-only-tool-loaders'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('api-client')

export default function ApiClientPage() {
  return (
    <div className="h-full w-full p-2 md:p-4">
      <ApiClientLazy />
    </div>
  )
}
