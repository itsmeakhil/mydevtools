import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('email-validator')

export default function EmailValidatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
