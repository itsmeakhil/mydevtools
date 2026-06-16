import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('image-compressor')

export default function ImageCompressorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
