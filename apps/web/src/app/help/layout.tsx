import type { Metadata } from 'next'
import HelpShell from './help-shell'

export const metadata: Metadata = {
  title: 'Help | MyDevTools',
  description:
    'Documentation for MyDevTools: apps, security, encryption, and how your data is handled.',
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <HelpShell>{children}</HelpShell>
}
