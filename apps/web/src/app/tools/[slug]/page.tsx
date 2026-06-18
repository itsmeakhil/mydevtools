import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, CheckCircle2, ExternalLink, Layers, BookOpen } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { toolsMetadata, toolSeoTitle } from '@/lib/metadata'
import { buildSoftwareApplicationJsonLd } from '@/lib/seo/structured-data'
import { publicToolSlugs, getRelatedTools, toolCategoryMap } from '@/lib/tool-categories'
import { getComparisonPagesForTool } from '@/lib/seo/comparison-pages'
import { getBlogPost, blogPosts } from '@/lib/blog/posts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

function featureSentence(keyword: string, toolTitle: string) {
  return `${toolTitle} supports ${keyword} workflows for quick browser-based developer tasks.`
}

export function generateStaticParams() {
  return publicToolSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tool = toolsMetadata[slug]
  if (!tool) return { title: 'Tool Not Found' }

  const title = `${toolSeoTitle(tool)} — ${tool.title} | MyDevTools`
  const description = tool.aiSummary ?? tool.description
  const url = `${baseUrl}/tools/${slug}`
  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(tool.title)}&description=${encodeURIComponent(tool.description)}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'MyDevTools',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: tool.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ToolLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tool = toolsMetadata[slug]
  if (!tool) notFound()

  const appUrl = `/app/${slug}`
  const category = toolCategoryMap[slug] ?? 'Developer Tools'
  const related = getRelatedTools(slug, 8)
  const comparisons = getComparisonPagesForTool(slug)
  const jsonLd = buildSoftwareApplicationJsonLd(slug)
  const h1 = toolSeoTitle(tool)
  const primaryKeyword = tool.keywords[0] ?? tool.title.toLowerCase()
  const blogPost = blogPosts.find((p) => p.toolSlug === slug)

  return (
    <div className="dark flex flex-col min-h-screen bg-background text-foreground font-sans">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <Header showThemeToggle={false} />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-500/12 blur-[100px]" />
            <div className="absolute -top-16 -right-32 w-[400px] h-[400px] rounded-full bg-sky-500/12 blur-[100px]" />
          </div>

          <div className="container px-4 md:px-6 mx-auto max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link href="/tools" className="hover:text-foreground transition-colors">Tools</Link>
              <span>/</span>
              <span className="text-foreground">{tool.title}</span>
            </nav>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/50 bg-muted/50 text-xs font-medium text-muted-foreground mb-6">
              <Layers className="w-3 h-3" />
              {category}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              {h1}
              <span className="block text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent mt-2 font-semibold">
                {tool.title} on MyDevTools
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              {tool.aiSummary ?? tool.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
              >
                Use {tool.title}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/tools"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium border border-border/60 dark:border-white/10 bg-background/70 text-foreground hover:bg-muted hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
              >
                Browse All Tools
              </Link>
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section className="py-12 md:py-16 border-t border-border/40">
          <div className="container px-4 md:px-6 mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">About {tool.title}</h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
              {tool.description} Runs entirely in your browser — no installation, no account required to try it.
            </p>

            <div className="grid gap-5 md:grid-cols-2 mb-10">
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
                <h3 className="text-lg font-semibold mb-3">
                  Common {tool.title} use cases
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Use {tool.title} when you need a fast, browser-based way to work
                  with {primaryKeyword}. It is useful during API debugging, code
                  reviews, documentation cleanup, test data preparation, and quick
                  checks on a new machine where you do not want to install a desktop
                  app. Because MyDevTools keeps related utilities together, you can
                  move from {tool.title} into nearby tools like formatters,
                  converters, generators, encoders, decoders, and API helpers
                  without leaving the same toolkit.
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
                <h3 className="text-lg font-semibold mb-3">
                  Example workflow
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A typical workflow starts by pasting or typing your input into
                  {` ${tool.title}`}. Review the result, copy the cleaned or generated
                  output, then continue with a related task such as validating a
                  payload, decoding a token, parsing a URL, generating an identifier,
                  or testing an API request. This makes {tool.title} part of a
                  practical developer workflow instead of a one-off utility page.
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Key Features</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tool.keywords.slice(0, 8).map((kw) => (
                <li key={kw} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{featureSentence(kw, tool.title)}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Runs in your browser — no install</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Free to use, always</span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── FAQ copy ── */}
        <section className="py-12 md:py-16 border-t border-border/40">
          <div className="container px-4 md:px-6 mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              {tool.title} FAQ
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  q: `Is ${tool.title} free to use?`,
                  a: `Yes. ${tool.title} is available through MyDevTools with a public landing page and browser-based app experience.`,
                },
                {
                  q: `Do I need to install anything for ${tool.title}?`,
                  a: `No. ${tool.title} runs in a web browser, so you can open it from any modern device without installing a desktop utility.`,
                },
                {
                  q: `What is ${tool.title} best for?`,
                  a: tool.aiSummary ?? tool.description,
                },
                {
                  q: `What should I use with ${tool.title}?`,
                  a: `Most developers pair ${tool.title} with related MyDevTools utilities such as formatters, parsers, encoders, generators, API tools, and security helpers.`,
                },
              ].map((item) => (
                <article
                  key={item.q}
                  className="rounded-2xl border border-border/40 bg-card/40 p-5"
                >
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to use ── */}
        <section className="py-12 md:py-16 border-t border-border/40 bg-muted/20">
          <div className="container px-4 md:px-6 mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">How to Use {tool.title}</h2>
            <ol className="space-y-6">
              {[
                { step: '01', title: 'Open the tool', body: `Click "Use ${tool.title} Free" above — no download or account required.` },
                { step: '02', title: 'Enter your data', body: 'Paste or type your input directly in the browser. Processing happens locally on your device.' },
                { step: '03', title: 'Copy the result', body: 'Get your output instantly. Copy it, download it, or keep working in the same tab.' },
              ].map((s) => (
                <li key={s.step} className="flex gap-5">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
              >
                Open {tool.title}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Blog Article ── */}
        {blogPost && (
          <section className="py-12 md:py-16 border-t border-border/40 bg-muted/20">
            <div className="container px-4 md:px-6 mx-auto max-w-4xl">
              <div className="rounded-2xl border border-border/40 bg-card p-8 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border/50 bg-muted/60 text-xs font-medium text-muted-foreground">
                    <BookOpen className="w-3 h-3" />
                    Learn
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">{blogPost.title}</h2>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">{blogPost.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                    <span>{blogPost.readingTimeMin} min read</span>
                    <span>•</span>
                    <span>{blogPost.category}</span>
                  </div>
                  <Link
                    href={`/blog/${blogPost.slug}`}
                    className="inline-flex items-center justify-center h-11 px-6 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
                  >
                    Read Article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Related tools ── */}
        {related.length > 0 && (
          <section className="py-12 md:py-16 border-t border-border/40">
            <div className="container px-4 md:px-6 mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">Related {category} Tools</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/tools/${r.slug}`}
                    className="group flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-border/70 p-5 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      {r.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug line-clamp-2">
                      {r.description}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all {category} tools
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {comparisons.length > 0 && (
          <section className="py-12 md:py-16 border-t border-border/40 bg-muted/20">
            <div className="container px-4 md:px-6 mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">
                {tool.title} comparisons and alternatives
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {comparisons.map((comparison) => (
                  <Link
                    key={comparison.slug}
                    href={`/compare/${comparison.slug}`}
                    className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-border/70 p-5 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      {comparison.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground leading-snug line-clamp-2">
                      {comparison.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
