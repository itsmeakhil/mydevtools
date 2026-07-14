import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('keycode-inspector')

export default function KeycodeInspectorPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
