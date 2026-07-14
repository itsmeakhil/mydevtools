import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('lorem-ipsum')

export default function LoremIpsumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
