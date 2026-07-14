import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('css-gradient-builder')

export default function CssGradientBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
