import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('jwt-decoder')

export default function JwtDecoderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
