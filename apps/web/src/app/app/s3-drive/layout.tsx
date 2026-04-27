import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('s3-drive')

export default function S3DriveLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
