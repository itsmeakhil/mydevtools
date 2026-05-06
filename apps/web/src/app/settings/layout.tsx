import type { Metadata } from 'next'
import SettingsClientLayout from './settings-client-layout'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your MyDevTools account preferences and app settings.',
  alternates: { canonical: `${baseUrl}/settings` },
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsClientLayout>{children}</SettingsClientLayout>
}
