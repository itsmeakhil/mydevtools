import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Courier_Prime } from 'next/font/google'

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ClientShell } from "@/components/client-shell";
import { DesktopInit } from "@/components/desktop/desktop-init";
import { UpdateProgressModal } from "@/components/desktop/update-progress-modal";

import "./globals.css";


import { siteMetadata } from "@/lib/metadata"

// Brand wordmark only — 700 is the heaviest weight Courier Prime ships.
const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-prime',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  title: {
    default: siteMetadata.title,
    template: '%s | MyDevTools'
  },
  description: siteMetadata.description,
  authors: [{ name: 'MyDevTools' }],
  creator: 'MyDevTools',
  publisher: 'MyDevTools',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteMetadata.url,
    title: siteMetadata.title,
    description: siteMetadata.description,
    siteName: siteMetadata.name,
    images: [
      {
        url: siteMetadata.ogImage,
        width: 1200,
        height: 630,
        alt: siteMetadata.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteMetadata.ogImage],
    creator: '@mydevtools',
  },
  alternates: {
    canonical: siteMetadata.url,
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon-192x192.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/icon-192x192.png',
    },
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const PREPAINT = `try{var d=document.documentElement,v=JSON.parse(localStorage.getItem('app-color-theme-vars')||'{}');for(var k in v)d.style.setProperty(k,v[k]);if('__TAURI_INTERNALS__' in window&&/Mac/.test(navigator.userAgent))d.setAttribute('data-vibrancy','');if(localStorage.getItem('app-reduce-transparency')==='1')d.setAttribute('data-reduce-transparency','')}catch(e){}`

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'ar' || locale === 'fa' ? 'rtl' : 'ltr';
  const htmlLang = locale === 'zh' ? 'zh-Hans' : locale;

  return (
    <html lang={htmlLang} dir={dir} suppressHydrationWarning className={cn(
      GeistSans.variable,
      GeistMono.variable,
      courierPrime.variable
    )}>
      <head>
        {/* The app ships its own dark theme; stop Dark Reader re-painting it. */}
        <meta name="darkreader-lock" />
        {/* Pre-paint: apply the cached accent scale and flag native macOS
            vibrancy (tauri.macos.conf.json) before first render — no flash. */}
        <Script id="prepaint" strategy="beforeInteractive">{PREPAINT}</Script>
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <DesktopInit />
            <UpdateProgressModal />
            <ClientShell>
              {children}
            </ClientShell>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
