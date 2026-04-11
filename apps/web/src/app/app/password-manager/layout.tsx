import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Password Manager',
  description: 'Securely store and manage passwords with client-side AES-256 encryption. Zero-knowledge vault.',
}

export default function PasswordManagerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
