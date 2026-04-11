import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NoSQL Explorer',
  description: 'Explore and manage your MongoDB databases directly from your browser.',
}

export default function NoSQLExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
