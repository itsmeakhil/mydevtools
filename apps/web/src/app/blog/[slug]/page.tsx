import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { blogPosts, getBlogPost } from '@/lib/blog/posts'
import { toolsMetadata } from '@/lib/metadata'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: 'Post Not Found' }

  const url = `${baseUrl}/blog/${slug}`
  const title = `${post.title} | MyDevTools Blog`

  return {
    title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: post.description,
      url,
      siteName: 'MyDevTools',
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const relatedTool = post.toolSlug ? toolsMetadata[post.toolSlug] : null
  const toolUrl = post.toolSlug ? `/tools/${post.toolSlug}` : null
  const appUrl = post.toolSlug ? `/app/${post.toolSlug}` : null

  const url = `${baseUrl}/blog/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.title,
        description: post.description,
        url,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        keywords: post.keywords.join(', '),
        inLanguage: 'en',
        isPartOf: { '@id': `${baseUrl}/blog` },
        publisher: {
          '@type': 'Organization',
          name: 'MyDevTools',
          url: baseUrl,
        },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntityOfPage: { '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
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
        <article>
          {/* Hero */}
          <section className="relative overflow-hidden py-16 md:py-24">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-500/12 blur-[100px]" />
              <div className="absolute -top-16 -right-32 w-[400px] h-[400px] rounded-full bg-sky-500/12 blur-[100px]" />
            </div>

            <div className="container mx-auto max-w-3xl px-4 md:px-6">
              <nav
                className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"
                aria-label="Breadcrumb"
              >
                <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
              </nav>

              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {post.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readingTimeMin} min read
                </span>
                <time dateTime={post.publishedAt} className="text-sm text-muted-foreground">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>

              <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl leading-[1.1]">
                {post.title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {post.description}
              </p>
            </div>
          </section>

          {/* Tool CTA banner */}
          {relatedTool && toolUrl && appUrl && (
            <div className="border-y border-border/40 bg-muted/20 py-5">
              <div className="container mx-auto max-w-3xl px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Try the free online tool mentioned in this guide:
                    <span className="ml-1 font-medium text-foreground">{relatedTool.title}</span>
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={appUrl}
                      className="inline-flex items-center justify-center h-9 px-5 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
                    >
                      Open tool
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={toolUrl}
                      className="inline-flex items-center justify-center h-9 px-5 rounded-full text-sm font-medium border border-border/60 bg-background/70 text-foreground hover:bg-muted transition-all"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Article body */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
              <div className="prose-content space-y-10">
                {post.sections.map((section, i) => (
                  <div key={i}>
                    <h2 className="text-xl md:text-2xl font-bold mb-3">{section.heading}</h2>
                    <div className="text-muted-foreground leading-relaxed space-y-4">
                      {section.body.split('\n\n').map((para, j) => {
                        if (para.startsWith('- ') || para.startsWith('**')) {
                          const lines = para.split('\n')
                          if (lines.every((l) => l.startsWith('- '))) {
                            return (
                              <ul key={j} className="space-y-2">
                                {lines.map((line, k) => (
                                  <li key={k} className="flex gap-2.5">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                                    <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="font-mono text-sm bg-muted rounded px-1 py-0.5">$1</code>') }} />
                                  </li>
                                ))}
                              </ul>
                            )
                          }
                        }
                        return (
                          <p
                            key={j}
                            dangerouslySetInnerHTML={{
                              __html: para
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/`(.*?)`/g, '<code class="font-mono text-sm bg-muted rounded px-1 py-0.5">$1</code>'),
                            }}
                          />
                        )
                      })}
                    </div>

                    {section.code && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-border/40">
                        {section.codeLanguage && (
                          <div className="flex items-center justify-between bg-muted/60 border-b border-border/40 px-4 py-2">
                            <span className="text-xs font-mono text-muted-foreground">{section.codeLanguage}</span>
                          </div>
                        )}
                        <pre className="overflow-x-auto bg-muted/30 p-4 text-sm font-mono leading-relaxed text-foreground/90">
                          <code>{section.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12 md:py-16 border-t border-border/40 bg-muted/20">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">Frequently asked questions</h2>
              <div className="space-y-4">
                {post.faqs.map((faq) => (
                  <article
                    key={faq.q}
                    className="rounded-2xl border border-border/50 bg-background/60 p-5"
                  >
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </article>

        {/* Bottom CTA */}
        {relatedTool && appUrl && toolUrl && (
          <section className="py-12 md:py-16 border-t border-border/40">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
              <div className="rounded-2xl border border-border/50 bg-card/50 p-8 text-center">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Try {relatedTool.title} for free
                </h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
                  {relatedTool.description} No install, no account required to try it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={appUrl}
                    className="inline-flex items-center justify-center h-11 px-7 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md transition-all hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Open {relatedTool.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href={toolUrl}
                    className="inline-flex items-center justify-center h-11 px-7 rounded-full text-sm font-medium border border-border/60 bg-background/70 text-foreground hover:bg-muted transition-all hover:scale-[1.03] active:scale-[0.98]"
                  >
                    View tool details
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="py-8 border-t border-border/40">
          <div className="container mx-auto max-w-3xl px-4 md:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all guides
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
