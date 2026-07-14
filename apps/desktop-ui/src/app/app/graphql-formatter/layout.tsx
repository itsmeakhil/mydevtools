import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('graphql-formatter')

export default function GraphqlFormatterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
