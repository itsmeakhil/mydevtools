import dynamic from 'next/dynamic'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-schema-generator')

const JsonSchemaGeneratorLayout = dynamic(
  () => import('@/components/json-schema-generator/json-schema-generator-layout').then(m => m.JsonSchemaGeneratorLayout),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" /> }
)

export default function JsonSchemaGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <JsonSchemaGeneratorLayout />
    </div>
  )
}
