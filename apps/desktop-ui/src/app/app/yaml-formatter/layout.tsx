import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('yaml-formatter')

export default function YamlFormatterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
