import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { GeistMono } from 'geist/font/mono'

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ClientShell } from "@/components/client-shell";

import "./globals.css";


import { siteMetadata } from "@/lib/metadata"
import { SiteWideJsonLd } from "@/components/seo/site-wide-json-ld"

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  title: {
    default: siteMetadata.title,
    template: '%s | MyDevTools'
  },
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
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
      GeistMono.variable
    )}>
      <head>
        {/* Firebase Auth & token refresh */}
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        {/* Firebase Storage */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        {/* Vercel Speed Insights */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <SiteWideJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <ClientShell>
              {children}
            </ClientShell>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
