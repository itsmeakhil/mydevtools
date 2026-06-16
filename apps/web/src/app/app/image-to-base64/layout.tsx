import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('image-to-base64')

export default function ImageToBase64Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
