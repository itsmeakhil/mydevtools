import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ToolsGrid } from '@/components/tools-grid'
import { publicToolSlugs } from '@/lib/tool-categories'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'

export const metadata: Metadata = {
  title: 'Online Developer Tools | MyDevTools',
  description:
    'Browse 50+ browser-based developer tools: JSON formatter, JWT decoder, API client, UUID generator, regex tester, and more. No install required.',
  alternates: { canonical: `${baseUrl}/tools` },
  openGraph: {
    title: 'Online Developer Tools | MyDevTools',
    description: 'Browse 50+ browser-based developer tools. No install required.',
    url: `${baseUrl}/tools`,
    siteName: 'MyDevTools',
    type: 'website',
  },
}

export default function ToolsIndexPage() {
  return (
    <div className="dark flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header showThemeToggle={false} />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 left-1/4 w-[500px] h-[400px] rounded-full bg-violet-500/10 blur-[120px]" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-sky-500/10 blur-[100px]" />
          </div>

          <div className="container px-4 md:px-6 mx-auto max-w-5xl text-center">
            <nav
              className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Tools</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Online{' '}
              <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                Developer Tools
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              {publicToolSlugs.length}+ browser-based utilities. No install, no account required to
              try them. Sign in to sync your data across devices.
            </p>

            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              Get Full Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Interactive Tool Grid ── */}
        <section className="py-12 md:py-16 border-t border-border/40">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <ToolsGrid />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
