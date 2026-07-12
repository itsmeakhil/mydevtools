import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('json-visualizer')

export default function JsonVisualizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
