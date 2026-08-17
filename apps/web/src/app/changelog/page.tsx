import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { changelog, changeTypeLabels, latestRelease, type ChangeType } from '@/lib/changelog'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('Changelog — MyDevTools')}&description=${encodeURIComponent(`Release notes for the MyDevTools desktop app. Latest version: ${latestRelease.version}.`)}`

export const metadata: Metadata = {
  title: { absolute: 'Changelog — MyDevTools Desktop App Release Notes' },
  description: `Every MyDevTools desktop release, what changed, and when. Latest version ${latestRelease.version}, released ${latestRelease.date}. New tools, improvements, and fixes for the offline developer toolkit.`,
  alternates: { canonical: `${baseUrl}/changelog` },
  openGraph: {
    title: 'Changelog — MyDevTools',
    description: `Release notes for the MyDevTools desktop app. Latest version: ${latestRelease.version}.`,
    url: `${baseUrl}/changelog`,
    siteName: 'MyDevTools',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'Changelog — MyDevTools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Changelog — MyDevTools',
    description: `Every MyDevTools desktop release. Latest version: ${latestRelease.version}.`,
    images: [ogImage],
  },
}

const typeStyles: Record<ChangeType, string> = {
  added: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  improved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  fixed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  removed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const typeOrder: ChangeType[] = ['added', 'improved', 'fixed', 'removed']

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

export default function ChangelogPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/changelog#software`,
        name: 'MyDevTools',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Windows, Linux',
        softwareVersion: latestRelease.version,
        releaseNotes: `${baseUrl}/changelog`,
        url: baseUrl,
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        publisher: { '@type': 'Organization', name: 'MyDevTools', url: baseUrl },
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/changelog#releases`,
        name: 'MyDevTools release history',
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: changelog.length,
        itemListElement: changelog.map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `MyDevTools ${entry.version}`,
          item: {
            '@type': 'SoftwareApplication',
            name: `MyDevTools ${entry.version}`,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'macOS, Windows, Linux',
            softwareVersion: entry.version,
            datePublished: entry.date,
            releaseNotes: entry.changes.map((change) => change.text).join(' '),
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/changelog#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Changelog', item: `${baseUrl}/changelog` },
        ],
      },
    ],
  }

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 left-1/4 h-[420px] w-[520px] rounded-full bg-violet-500/10 blur-[120px]" />
            <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[100px]" />
          </div>

          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <nav
              className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground">Changelog</span>
            </nav>

            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-[1.08]">
              Changelog
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Every release of the MyDevTools desktop app — new tools, improvements, and fixes.
              The app updates itself in the background, so you are usually already on the latest build.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-400">
                Latest: v{latestRelease.version}
              </span>
              <span className="text-muted-foreground">
                Released {formatDate(latestRelease.date)}
              </span>
              <Link
                href="/download"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Download
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <ol className="border-l border-border/50 pl-6 md:pl-8">
              {changelog.map((entry) => {
                const groups = typeOrder
                  .map((type) => ({ type, items: entry.changes.filter((c) => c.type === type) }))
                  .filter((group) => group.items.length > 0)

                return (
                  <li key={entry.version} className="relative pb-12 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute -left-[calc(1.5rem+5px)] top-2 h-[9px] w-[9px] rounded-full bg-border md:-left-[calc(2rem+5px)]"
                    />

                    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-xl font-semibold tracking-tight">v{entry.version}</h2>
                      <time dateTime={entry.date} className="text-sm text-muted-foreground">
                        {formatDate(entry.date)}
                      </time>
                    </div>

                    {entry.title && (
                      <p className="mb-2 text-lg font-medium text-foreground">{entry.title}</p>
                    )}
                    {entry.summary && (
                      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {entry.summary}
                      </p>
                    )}

                    <div className="flex flex-col gap-4">
                      {groups.map((group) => (
                        <div key={group.type} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                          <span
                            className={`inline-flex h-fit w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium sm:w-24 sm:justify-center ${typeStyles[group.type]}`}
                          >
                            {changeTypeLabels[group.type]}
                          </span>
                          <ul className="flex flex-col gap-1.5">
                            {group.items.map((change) => (
                              <li
                                key={change.text}
                                className="text-sm leading-relaxed text-muted-foreground"
                              >
                                {change.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
