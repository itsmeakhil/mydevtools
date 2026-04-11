import type { Metadata } from 'next'
import SettingsClientLayout from './settings-client-layout'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your MyDevTools account preferences and app settings.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsClientLayout>{children}</SettingsClientLayout>
}
