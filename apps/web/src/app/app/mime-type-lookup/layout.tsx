import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('mime-type-lookup')

export default function MimeTypeLookupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
