import type { Metadata } from 'next'
import ProfileClientLayout from './profile-client-layout'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your MyDevTools account profile and achievements.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileClientLayout>{children}</ProfileClientLayout>
}
