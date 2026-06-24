import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ToolsGrid } from '@/components/tools-grid'
import { publicToolSlugs } from '@/lib/tool-categories'
import { MdtFx } from '@/components/mdt-fx'
import MdtAurora from '@/components/mdt-aurora'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydevtools.tech'
const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('Online Developer Tools')}&description=${encodeURIComponent('Browse 50+ browser-based developer tools. No install required.')}`

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
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'Online Developer Tools | MyDevTools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Developer Tools | MyDevTools',
    description: 'Browse 50+ browser-based developer tools. No install required.',
    images: [ogImage],
  },
}

export default function ToolsIndexPage() {
  return (
    <div className="dark mdt-deck flex flex-col min-h-screen bg-background text-foreground font-sans">
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
      <Header showThemeToggle={false} />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <MdtAurora />
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
              <span className="mdt-grad-text mdt-grad-anim">
                Developer Tools
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              {publicToolSlugs.length}+ browser-based utilities. No install, no account required to
              try them. Sign in to sync your data across devices.
            </p>

            <Link
              href="/login"
              className="mdt-btn-grad inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium"
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
