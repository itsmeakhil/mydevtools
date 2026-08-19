import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingSeoPage } from '@/components/marketing-seo-page'
import { getPlatformSeoPage } from '@/lib/seo/platform-pages'
import { SOURCE_URL } from '@/components/footer'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const page = getPlatformSeoPage('open-source')
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(page?.title ?? 'MyDevTools')}&description=${encodeURIComponent(page?.description ?? 'Open source desktop developer tools')}`

export const metadata: Metadata = {
  title: page?.title,
  description: page?.description,
  keywords: page?.keywords,
  alternates: { canonical: `${baseUrl}/open-source` },
  openGraph: {
    title: `${page?.title} | MyDevTools`,
    description: page?.description,
    url: `${baseUrl}/open-source`,
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

/** Repo files worth linking directly — they answer "how do I take part?". */
const repoLinks = [
  {
    label: 'Source code',
    href: SOURCE_URL,
    description: 'The monorepo: Tauri shell, desktop UI and this website.',
  },
  {
    label: 'License (AGPL-3.0)',
    href: `${SOURCE_URL}/blob/main/LICENSE`,
    description: 'Full license text.',
  },
  {
    label: 'Contributing guide',
    href: `${SOURCE_URL}/blob/main/CONTRIBUTING.md`,
    description: 'Setup, commands, conventions and how to add a tool.',
  },
  {
    label: 'Roadmap',
    href: `${SOURCE_URL}/blob/main/ROADMAP.md`,
    description: 'What is being built now, next, and what is not planned.',
  },
  {
    label: 'Security policy',
    href: `${SOURCE_URL}/blob/main/SECURITY.md`,
    description: 'How to report a vulnerability privately.',
  },
  {
    label: 'Good first issues',
    href: `${SOURCE_URL}/labels/good%20first%20issue`,
    description: 'Scoped starter work for a first contribution.',
  },
  {
    label: 'Discussions',
    href: `${SOURCE_URL}/discussions`,
    description: 'Questions, ideas and workflows.',
  },
  {
    label: 'Releases',
    href: `${SOURCE_URL}/releases`,
    description: 'Every build, with release notes.',
  },
]

export default function OpenSourcePage() {
  if (!page) return null
  return (
    <MarketingSeoPage page={page}>
      <section className="py-8 md:py-12">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-2 text-2xl font-bold md:text-3xl">
            Everything is in the repository
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            No private core, no open-core split, no &ldquo;source available&rdquo;
            asterisk. The app you download is built from this code.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {repoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="glass-overlay mdt-card-hover p-4"
              >
                <h3 className="mb-1 font-semibold">{link.label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {link.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingSeoPage>
  )
}
