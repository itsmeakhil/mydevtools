import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { blogPosts } from '@/lib/blog/posts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const postCount = blogPosts.length
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('Developer Blog — MyDevTools')}&description=${encodeURIComponent(`${postCount} SEO-optimized guides: JWT decoding, JSON formatting, regex, SQL, cryptography, data conversion, and more.`)}`

export const metadata: Metadata = {
  title: { absolute: `Developer Blog — ${postCount} Guides on Tools & Coding | MyDevTools` },
  description:
    `${postCount} practical developer guides: JWT decoding, JSON formatting, regex patterns, SQL queries, hash generation, URL parsing, CSV conversion, SSH keys, QR codes, encryption, email validation, Redis, certificates, and more.`,
  alternates: { canonical: `${baseUrl}/blog` },
  openGraph: {
    title: 'Developer Blog — MyDevTools',
    description: `${postCount} SEO-optimized guides: JWT decoding, JSON formatting, regex, SQL, cryptography, data conversion, and more.`,
    url: `${baseUrl}/blog`,
    siteName: 'MyDevTools',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'Developer Blog — MyDevTools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developer Blog — MyDevTools',
    description: `${postCount} practical guides: decode JWTs, format JSON, parse URLs, query SQL, generate hashes, validate emails, and more.`,
    images: [ogImage],
  },
}

const categoryColors: Record<string, string> = {
  Security: 'bg-red-500/10 text-red-400 border-red-500/20',
  Formatters: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Converters: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Generators: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Network & API': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Databases: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Utilities: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Validators: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function BlogPage() {
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'MyDevTools Developer Blog',
    description: 'Practical developer guides and tutorials.',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'MyDevTools',
      url: baseUrl,
    },
    blogPost: sortedPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
    })),
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
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground">Blog</span>
            </nav>

            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-[1.08]">
              {postCount} SEO-optimized developer guides
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              In-depth explanations covering databases (SQL, Redis, MongoDB), cryptography (SSH keys, encryption, hashing), data conversion (CSV, YAML, JSON), utilities (URL parsing, email validation, QR codes), and more. Written for search engines and AI agents.
            </p>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto max-w-5xl px-4 md:px-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {sortedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/60 p-6 transition-all hover:bg-muted/30 hover:border-border/80 hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[post.category] ?? 'bg-muted text-muted-foreground border-border/50'}`}
                    >
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {post.readingTimeMin} min read
                    </span>
                  </div>

                  <div>
                    <h2 className="mb-2 text-lg font-semibold leading-snug group-hover:text-foreground transition-colors flex items-start gap-1.5">
                      {post.title}
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {post.description}
                    </p>
                  </div>

                  <time
                    dateTime={post.publishedAt}
                    className="mt-auto text-xs text-muted-foreground"
                  >
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
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
