import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('bookmarks')

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
