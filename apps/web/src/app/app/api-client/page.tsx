import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('api-client')

const ApiClient = dynamic(
  () => import('@/components/api-client/api-client').then(m => m.ApiClient),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function ApiClientPage() {
  return (
    <div className="h-full w-full p-4">
      <ApiClient />
    </div>
  )
}
