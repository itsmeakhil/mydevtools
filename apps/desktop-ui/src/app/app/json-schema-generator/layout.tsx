import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-schema-generator')

export default function JsonSchemaGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
