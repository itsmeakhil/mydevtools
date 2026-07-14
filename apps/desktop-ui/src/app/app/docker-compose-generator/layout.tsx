import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('docker-compose-generator')

export default function DockerComposeGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
