import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('ssh-key-generator')

export default function SshKeyGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
