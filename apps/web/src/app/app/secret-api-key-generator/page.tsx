import { SecretApiKeyGeneratorLayout } from '@/components/secret-api-key-generator/secret-api-key-generator-layout'
import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('secret-api-key-generator')

export default function SecretApiKeyGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <SecretApiKeyGeneratorLayout />
    </div>
  )
}
