import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('svg-optimizer')

export default function SvgOptimizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
