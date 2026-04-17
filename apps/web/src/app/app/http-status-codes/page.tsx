import { HttpStatusCodesLayout } from '@/components/http-status-codes/http-status-codes-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('http-status-codes')

export default function HttpStatusCodesPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <HttpStatusCodesLayout />
    </div>
  )
}

