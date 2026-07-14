import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('beautify-minify')

export default function BeautifyMinifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
