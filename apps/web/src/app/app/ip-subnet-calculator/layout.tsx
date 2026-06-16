import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('ip-subnet-calculator')

export default function IpSubnetCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
