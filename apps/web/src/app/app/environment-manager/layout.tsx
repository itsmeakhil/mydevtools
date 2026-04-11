import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('environment-manager')

export default function EnvironmentManagerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
