import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  comparisonPageSlugs,
  getComparisonPage,
} from '@/lib/seo/comparison-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export function generateStaticParams() {
  return comparisonPageSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getComparisonPage(slug)
  if (!page) return { title: 'Comparison Not Found' }

  const url = `${baseUrl}/compare/${slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${page.title} | MyDevTools`,
      description: page.description,
      url,
      siteName: 'MyDevTools',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | MyDevTools`,
      description: page.description,
    },
  }
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getComparisonPage(slug)
  if (!page) notFound()

  const url = `${baseUrl}/compare/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: `${baseUrl}/compare/${slug}` },
          { '@type': 'ListItem', position: 3, name: page.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: page.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
          },
        })),
      },
    ],
  }

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header showThemeToggle={false} />
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
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">{page.eyebrow}</span>
            </nav>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-sky-400">
              {page.eyebrow}
            </p>
            <h1 className="mb-6 max-w-4xl text-4xl font-bold tracking-tight leading-[1.08] sm:text-5xl md:text-6xl">
              {page.heading}
            </h1>
            <p className="mb-8 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {page.intro}
            </p>
            <Link
              href={page.primaryCta.href}
              className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-medium text-background shadow-md transition-all hover:bg-foreground/90 hover:scale-[1.03] active:scale-[0.98]"
            >
              {page.primaryCta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border-y border-border/40 bg-muted/20 py-14 md:py-20">
          <div className="container mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-3 md:px-6">
            {page.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-border/50 bg-background/60 p-6 shadow-sm"
              >
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
          <div className="container mx-auto max-w-4xl px-4 md:px-6">
            <h2 className="mb-8 text-2xl font-bold md:text-3xl">
              Common comparison questions
            </h2>
            <div className="space-y-4">
              {page.faqs.map((faq) => (
                <article
                  key={faq.q}
                  className="rounded-2xl border border-border/50 bg-background/60 p-5"
                >
                  <h3 className="mb-2 font-semibold">{faq.q}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
