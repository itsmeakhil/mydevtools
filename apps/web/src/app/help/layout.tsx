import type { Metadata } from 'next'
import HelpShell from './help-shell'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const metadata: Metadata = {
  title: 'Help | MyDevTools',
  description:
    'Documentation for MyDevTools: apps, security, encryption, and how your data is handled.',
  alternates: { canonical: `${baseUrl}/help` },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <HelpShell>{children}</HelpShell>
}
