import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('bcrypt-generator')

export default function BcryptGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
