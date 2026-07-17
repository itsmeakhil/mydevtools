import type { Metadata } from 'next'
import HelpClientLayout from './help-client-layout'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const metadata: Metadata = {
  title: 'Help',
  description:
    'How MyDevTools works offline: apps, activation, encryption, and how your data stays on your device.',
  alternates: { canonical: `${baseUrl}/help` },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <HelpClientLayout>{children}</HelpClientLayout>
}
