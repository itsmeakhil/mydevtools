import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('password-manager')

export default function PasswordManagerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
