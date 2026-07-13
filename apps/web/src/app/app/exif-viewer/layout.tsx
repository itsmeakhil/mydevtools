import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('exif-viewer')

export default function ExifViewerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
