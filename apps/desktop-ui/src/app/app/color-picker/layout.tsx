import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('color-picker')

export default function ColorPickerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
