import type { Metadata } from 'next'
import Link from 'next/link'
import { Laptop, Cloud } from 'lucide-react'
import { MarketingSeoPage } from '@/components/marketing-seo-page'
import { getPlatformSeoPage } from '@/lib/seo/platform-pages'
import { SOURCE_URL } from '@/components/footer'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const page = getPlatformSeoPage('privacy')
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(page?.title ?? 'MyDevTools')}&description=${encodeURIComponent(page?.description ?? 'Local-first developer tools')}`

export const metadata: Metadata = {
  title: page?.title,
  description: page?.description,
  keywords: page?.keywords,
  alternates: { canonical: `${baseUrl}/privacy` },
  openGraph: {
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    url: `${baseUrl}/privacy`,
    siteName: 'MyDevTools',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: page?.title ?? 'MyDevTools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    images: [ogImage],
  },
}

/** Stays on the device. */
const localParts = [
  'Developer tools (formatting, encoding, hashing, parsing)',
  'API client — collections, environments, history',
  'SQL · MongoDB · Redis · S3 clients',
  'Notes, snippets, tasks, bookmarks',
  'Encrypted vault — passwords, API keys, .env sets',
  'SQLCipher database, keyed from your OS keychain',
]

/** Leaves the device, and only because a tool was pointed at it. */
const outboundParts = [
  {
    what: 'API client requests',
    where: 'The hosts you type into the request bar',
  },
  {
    what: 'Database & storage connections',
    where: 'Your PostgreSQL, MySQL, MongoDB, Redis or S3 endpoint',
  },
  {
    what: 'DNS and WHOIS lookups',
    where: 'Public DNS resolvers and RDAP/WHOIS registries',
  },
  {
    what: 'Update check',
    where: 'GitHub releases, to see whether a newer version exists',
  },
  {
    what: 'Anonymous usage events (opt-in, off by default)',
    where: 'Aptabase — a rotating session id, app version and locale. Nothing else.',
  },
]

export default function PrivacyPage() {
  if (!page) return null
  return (
    <MarketingSeoPage page={page}>
      <section className="py-8 md:py-12">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-2 text-2xl font-bold md:text-3xl">
            Where your data actually lives
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            There is no MyDevTools server in this diagram, because there is no
            MyDevTools server.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* On-device */}
            <div className="glass-overlay relative overflow-hidden p-6">
              <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />
              <div className="mb-4 flex items-center gap-2">
                <Laptop className="h-5 w-5 text-sky-400" aria-hidden />
                <h3 className="text-lg font-semibold">Your computer</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Everything below runs and stays inside the app on your machine.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {localParts.map((part) => (
                  <li
                    key={part}
                    className="rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                  >
                    {part}
                  </li>
                ))}
              </ul>
            </div>

            {/* Outbound */}
            <div className="glass-overlay relative overflow-hidden p-6">
              <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />
              <div className="mb-4 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-sky-400" aria-hidden />
                <h3 className="text-lg font-semibold">What leaves, and why</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Only what a tool was pointed at — going straight from your machine
                to that destination, never through us.
              </p>
              <ul className="space-y-2 text-sm">
                {outboundParts.map((part) => (
                  <li
                    key={part.what}
                    className="rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{part.what}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      → {part.where}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Every claim here is checkable —{' '}
            <Link
              href={`${SOURCE_URL}/blob/main/apps/desktop-ui/src/lib/telemetry.ts`}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              the telemetry module
            </Link>{' '}
            is about a hundred lines, and the{' '}
            <Link
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              rest of the app
            </Link>{' '}
            is open source under the AGPL-3.0.
          </p>
        </div>
      </section>
    </MarketingSeoPage>
  )
}
