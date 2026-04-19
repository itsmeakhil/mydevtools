import { generateToolMetadata } from '@/lib/metadata'
import { DockerComposeGeneratorLayout } from '@/components/docker-compose-generator/docker-compose-generator-layout'

export function generateMetadata() {
  return generateToolMetadata('docker-compose-generator')
}

export default function DockerComposeGeneratorPage() {
  return (
    <div className="h-full w-full min-h-0 p-2 md:p-4">
      <DockerComposeGeneratorLayout />
    </div>
  )
}
