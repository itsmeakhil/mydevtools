import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookmarks',
  description: 'Save and organize your favorite links and developer resources in one place.',
}

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
