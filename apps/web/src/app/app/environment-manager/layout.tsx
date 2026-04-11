import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Environment Manager',
  description: 'Organize environment variables by project and environment. AES-256 encrypted before sync.',
}

export default function EnvironmentManagerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
