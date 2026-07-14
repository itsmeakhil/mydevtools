import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('css-generators')

export default function CssGeneratorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
