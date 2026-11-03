'use client'

import Link from 'next/link'
import {
  BookOpen,
  LayoutGrid,
  Shield,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { getToolMessageKey } from '@/lib/tool-i18n'

const appItems = sidebarData.navGroups.flatMap((g) => g.items)

const appDetails: Record<
  string,
  { howItWorks: string[]; dataNote?: string }
> = {
  '/app/to-do': {
    howItWorks: [
      'Organize work in projects, lists, and tasks with optional Kanban columns.',
      'Projects, lists, and tasks are saved to the local database on your device.',
    ],
  },
  '/app/notes': {
    howItWorks: [
      'Create rich notes with formatting, blocks, and media-style editing.',
      'Notes are saved to the local encrypted database on your device.',
    ],
  },
  '/app/password-manager': {
    howItWorks: [
      'Set a master password once per session to unlock your vault.',
      'Add, edit, search, and generate strong passwords; import/export is available from the manager UI.',
      'Entries are encrypted on your device with your master key before they are written to the local database.',
    ],
    dataNote:
      'Only ciphertext and IVs are stored, in your local database on this device. Your master password is never written to disk or sent anywhere.',
  },
  '/app/environment-manager': {
    howItWorks: [
      'Uses the same master vault key as the password manager.',
      'Group variables by project name and environment (for example staging vs production).',
      'Add tags, optional notes, key/value rows, or paste a .env block to merge variables.',
      'Copy a formatted .env file to the clipboard when you need it locally.',
    ],
    dataNote:
      'Each set is stored as ciphertext plus an IV in the local database; plaintext keys and values exist only on your device after unlock.',
  },
  '/app/json-formatter': {
    howItWorks: [
      'Paste or write JSON, then format, minify, validate, and switch between text and tree views.',
      'Processing runs entirely on your device; nothing is sent anywhere.',
    ],
  },
  '/app/api-client': {
    howItWorks: [
      'Build HTTP requests with method, URL, query params, headers, and body.',
      'Use environments for variables, save requests into collections, and review history.',
      'Collections and history are saved to the local database on your device.',
    ],
    dataNote:
      'Requests you send go to the targets you choose over your own network connection. Use the app only with APIs you trust.',
  },
  '/app/data-explorer': {
    howItWorks: [
      'Connect to PostgreSQL, MySQL, MongoDB, Redis, Firestore, or Elasticsearch, browse the tree, and run queries.',
      'Saved connections are encrypted with your global master key on your device; only ciphertext is written to the local database.',
    ],
    dataNote:
      'You are responsible for connection strings and data accessed on your databases.',
  },
  '/app/email-validator': {
    howItWorks: [
      'Validate single addresses or upload bulk lists (CSV/spreadsheet).',
      'Syntax, disposable, and role checks run on your device; domain and MX-record lookups query public DNS and need a network connection.',
    ],
    dataNote:
      'Domain and MX checks require a network connection. Avoid uploading highly sensitive lists on shared networks.',
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-foreground">{children}</h3>
}

export default function HelpPage() {
  const t = useTranslations('Help')
  const tNav = useTranslations('Navigation')
  const tTools = useTranslations('Dashboard.tools')

  return (
    <div className="flex-1 space-y-6 p-6 pb-24 md:pb-8 max-w-[820px] mx-auto w-full pt-[calc(theme(spacing.16)+env(safe-area-inset-top))] md:pt-[calc(theme(spacing.8)+env(safe-area-inset-top))]">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm max-w-3xl">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {t('tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="apps" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            {t('tabs.apps')}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {t('tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            {t('tabs.tips')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>{t('overview.whatIs.title')}</CardTitle>
              <CardDescription>
                {t('overview.whatIs.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {t('overview.whatIs.p1')}{' '}
                <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
                  {t('overview.whatIs.settingsLink')}
                </Link>
                {t('overview.whatIs.p1After')}
              </p>
              <p>
                {t.rich('overview.whatIs.p2', {
                  strong: (chunks) => (
                    <strong className="text-foreground font-medium">{chunks}</strong>
                  ),
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('overview.quickLinks.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-input bg-card px-3 text-[13px] font-medium shadow-elev-1 transition-colors hover:bg-accent"
              >
                {t('overview.quickLinks.dashboard')}
              </Link>
              <Link
                href="/settings"
                className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-input bg-card px-3 text-[13px] font-medium shadow-elev-1 transition-colors hover:bg-accent"
              >
                {t('overview.quickLinks.settings')}
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="mt-0 space-y-4 outline-none">
          <p className="text-sm text-muted-foreground">{t('apps.intro')}</p>
          <div className="grid gap-4">
            {appItems.map((item) => {
              const url = typeof item.url === 'string' ? item.url : String(item.url)
              const Icon = item.icon
              const extra = appDetails[url]
              const toolKey = getToolMessageKey(url)
              const cardTitle = toolKey ? tNav(toolKey as never) : item.title
              const cardDescription = toolKey
                ? tTools(`${toolKey}.description` as never)
                : item.description
              return (
                <Card
                  key={url}
                  className="overflow-hidden"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {Icon && (
                          <Icon
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                        <CardTitle>{cardTitle}</CardTitle>
                      </div>
                      <Link
                        href={url}
                        className={cn(
                          'inline-flex items-center gap-1 shrink-0 text-xs font-medium text-primary',
                          'underline-offset-4 hover:underline'
                        )}
                      >
                        {t('apps.open')}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                    <CardDescription>{cardDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {extra ? (
                      <>
                        <SectionTitle>{t('apps.howItWorks')}</SectionTitle>
                        <ul className="list-disc pl-5 space-y-1">
                          {extra.howItWorks.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        {extra.dataNote ? (
                          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed">
                            {extra.dataNote}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p>{t('apps.generic')}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 space-y-4 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>{t('security.access.title')}</CardTitle>
              <CardDescription>{t('security.access.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  {t.rich('security.access.items.activation', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
                <li>
                  {t.rich('security.access.items.offline', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
                <li>
                  {t.rich('security.access.items.storage', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('security.encryption.title')}</CardTitle>
              <CardDescription>{t('security.encryption.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {t.rich('security.encryption.p1', {
                  strong: (chunks) => (
                    <strong className="text-foreground font-medium">{chunks}</strong>
                  ),
                })}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  {t.rich('security.encryption.items.kdf', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
                <li>
                  {t.rich('security.encryption.items.aes', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
                <li>
                  {t.rich('security.encryption.items.scope', {
                    strong: (chunks) => (
                      <strong className="text-foreground font-medium">{chunks}</strong>
                    ),
                  })}
                </li>
              </ul>
              <p className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs leading-relaxed text-foreground/90">
                {t('security.encryption.warning')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('security.local.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                {t('security.local.body')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="mt-0 space-y-4 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>{t('tips.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('tips.items.masterPassword')}</li>
                <li>{t('tips.items.backup')}</li>
                <li>{t('tips.items.apiClient')}</li>
                <li>{t('tips.items.nosql')}</li>
                <li>{t('tips.items.json')}</li>
                <li>{t('tips.items.settings')}</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
