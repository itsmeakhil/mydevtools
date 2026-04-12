import { generateToolMetadata } from '@/lib/metadata'
import { GradientLayout } from '@/components/css-gradient-builder/gradient-layout'

export function generateMetadata() {
  return generateToolMetadata('css-gradient-builder')
}

export default function CssGradientBuilderPage() {
  return <GradientLayout />
}
