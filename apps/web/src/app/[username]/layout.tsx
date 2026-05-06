import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const encodedUsername = encodeURIComponent(username)

  return {
    title: `${username} | MyDevTools`,
    description: `Public developer profile for ${username} on MyDevTools.`,
    alternates: { canonical: `${baseUrl}/${encodedUsername}` },
    openGraph: {
      title: `${username} | MyDevTools`,
      description: `Public developer profile for ${username} on MyDevTools.`,
      url: `${baseUrl}/${encodedUsername}`,
      siteName: 'MyDevTools',
      type: 'profile',
    },
  }
}

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
