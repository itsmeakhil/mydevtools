import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { MdtFx } from '@/components/mdt-fx'
import MdtAurora from '@/components/mdt-aurora'
import type { PlatformSeoPage } from '@/lib/seo/platform-pages'
import { publicToolSlugs } from '@/lib/tool-categories'
import { toolsMetadata } from '@/lib/metadata'
import { buildPlatformPageJsonLd } from '@/lib/seo/structured-data'

const popularToolSlugs = [
  'json-formatter',
  'jwt-decoder',
  'api-client',
  'regex-tester',
  'uuid-generator',
  'base64',
]

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

function CtaLink({
  href,
  label,
  variant = 'primary',
}: {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}) {
  const external = isExternalHref(href)
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={
        variant === 'primary'
          ? 'mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium'
          : 'inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-background/60 px-7 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98]'
      }
    >
      {label}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Link>
  )
}

export function MarketingSeoPage({ page }: { page: PlatformSeoPage }) {
  const popularTools = popularToolSlugs
    .filter((slug) => publicToolSlugs.includes(slug) && toolsMetadata[slug])
    .map((slug) => ({ slug, ...toolsMetadata[slug] }))
  const jsonLd = buildPlatformPageJsonLd(page.slug)

  return (
    <div className="dark mdt-deck flex min-h-screen flex-col bg-background text-foreground font-sans">
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div className="mdt-grid" />
        <div className="mdt-noise" />
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
          <defs>
            <linearGradient id="mdtGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b63f0" />
              <stop offset="52%" stopColor="#9a5cf2" />
              <stop offset="100%" stopColor="#4fd0e6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <MdtFx />
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <Header showThemeToggle={false} />
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <MdtAurora />
            <div className="absolute -top-32 left-1/4 h-[420px] w-[520px] rounded-full bg-violet-500/10 blur-[120px]" />
            <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[100px]" />
          </div>

          <div className="container mx-auto max-w-5xl px-4 text-center md:px-6">
            <nav
              className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">{page.eyebrow}</span>
            </nav>

            <p className="mdt-kicker mb-4">
              {page.eyebrow}
            </p>
            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold tracking-tight leading-[1.08] sm:text-5xl md:text-6xl">
              {page.heading}
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {page.intro}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {page.primaryCta ? <CtaLink {...page.primaryCta} /> : null}
              {page.secondaryCta ? (
                <CtaLink {...page.secondaryCta} variant="secondary" />
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-y border-border/40 bg-muted/20 py-14 md:py-20">
          <div className="container mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3 md:px-6">
            {page.sections.map((section) => (
              <article
                key={section.title}
                className="glass-overlay mdt-card-hover relative overflow-hidden p-6"
              >
                <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />
                <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold md:text-3xl">
                  Popular online developer tools
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Continue from the platform page into canonical public tool pages.
                </p>
              </div>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                See all {publicToolSlugs.length} tools
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popularTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group glass-overlay mdt-card-hover p-4"
                >
                  <h3 className="mb-1 flex items-center gap-1.5 font-semibold">
                    {tool.title}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100" />
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
