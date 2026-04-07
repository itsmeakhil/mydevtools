import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'sonner'
import { ThemeProvider } from "@/components/theme-provider"
import { UserPreferencesSync } from "@/components/user-preferences-sync"
import { ToolVisibilityPreferencesSync } from "@/components/tool-visibility-preferences-sync"
import { AppUpdateNotifier } from "@/components/app-update-notifier"
import { cn } from "@/lib/utils"
import { Geist_Mono as NextGeistMono } from 'next/font/google'

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import "./globals.css";

const geistMono = NextGeistMono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
})

import { siteMetadata } from "@/lib/metadata"

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
  maximumScale: 1,
  userScalable: false,
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
      geistMono.variable
    )}>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <UserPreferencesSync />
            <ToolVisibilityPreferencesSync />
            <AppUpdateNotifier />
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
