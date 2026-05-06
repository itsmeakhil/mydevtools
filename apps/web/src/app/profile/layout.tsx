import type { Metadata } from 'next'
import ProfileClientLayout from './profile-client-layout'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your MyDevTools account profile and achievements.',
  alternates: { canonical: `${baseUrl}/profile` },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileClientLayout>{children}</ProfileClientLayout>
}
