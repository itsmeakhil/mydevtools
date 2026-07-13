import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('chmod-calculator')

export default function ChmodCalculatorPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
