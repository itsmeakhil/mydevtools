import { ApiClientLazy } from '@/components/app-tools/client-only-tool-loaders'
import { ApiClientProviders } from '@/components/api-client/context/api-client-context'

export default function ApiClientPage() {
  return (
    <ApiClientProviders>
      <div className="h-full w-full p-2 md:p-4">
        <ApiClientLazy />
      </div>
    </ApiClientProviders>
  )
}
