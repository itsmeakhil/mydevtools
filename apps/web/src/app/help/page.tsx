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
      'Tasks are stored locally on your device.',
    ],
  },
  '/app/notes': {
    howItWorks: [
      'Create rich notes with formatting, blocks, and media-style editing.',
      'Notes are stored locally on your device.',
    ],
  },
  '/app/password-manager': {
    howItWorks: [
      'Set a master password once per session to unlock your vault.',
      'Add, edit, search, and generate strong passwords; import/export is available from the manager UI.',
      'Entries are encrypted on your device and stored in a local vault.',
    ],
    dataNote:
      'Vault entries are stored as ciphertext on your device. Your master password never leaves your machine.',
  },
  '/app/environment-manager': {
    howItWorks: [
      'Uses the same master vault key as the password manager.',
      'Group variables by project name and environment (for example staging vs production).',
      'Add tags, optional notes, key/value rows, or paste a .env block to merge variables.',
      'Copy a formatted .env file to the clipboard when you need it locally.',
    ],
    dataNote:
      'Each set is stored as ciphertext plus an IV; plaintext keys and values exist only on your device after unlock.',
  },
  '/app/bookmarks': {
    howItWorks: [
      'Save URLs in folders, edit titles, and open links quickly from the grid.',
      'Bookmarks are stored locally on your device and work fully offline.',
    ],
  },
  '/app/json-formatter': {
    howItWorks: [
      'Paste or write JSON, then format, minify, validate, and switch between text and tree views.',
      'Processing runs locally; nothing is sent to the server for formatting.',
    ],
  },
  '/app/json-schema-generator': {
    howItWorks: [
      'Paste valid JSON (including nested objects and arrays). The tool infers a structural schema from your sample.',
      'Choose an output language to generate JSON Schema (Draft 2020-12) or starter types for Python, TypeScript, Go, Rust, Java, C#, Dart, or Swift.',
      'All inference and code generation run locally on your device.',
    ],
  },
  '/app/api-client': {
    howItWorks: [
      'Build HTTP requests with method, URL, query params, headers, and body.',
      'Use environments for variables, save requests into collections, and review history.',
      'Collections and history are stored locally on your device.',
    ],
    dataNote:
      'Requests you send go to the targets you choose. Use the app only with APIs you trust.',
  },
  '/app/database-explorer': {
    howItWorks: [
      'Connect to MongoDB using a connection string, browse databases and collections, and run queries.',
      'Saved connections are encrypted with your global master key on your device; the backend stores ciphertext only.',
    ],
    dataNote:
      'You are responsible for connection strings and data accessed on your databases.',
  },
  '/app/email-validator': {
    howItWorks: [
      'Validate single addresses or upload bulk lists (CSV/spreadsheet).',
      'Checks include syntax, domain, MX records, disposable/role detection, and related signals via the app API.',
    ],
    dataNote:
      'Addresses you submit are sent to the validation service for those checks. Avoid uploading highly sensitive lists on shared networks.',
  },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
}

export default function HelpPage() {
  const t = useTranslations('Help')
  const tNav = useTranslations('Navigation')
  const tTools = useTranslations('Dashboard.tools')

  return (
    <div className="flex-1 space-y-6 p-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full pt-[calc(theme(spacing.16)+env(safe-area-inset-top))] md:pt-[calc(theme(spacing.8)+env(safe-area-inset-top))] bg-background/50">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8 opacity-80 shrink-0" aria-hidden />
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-3xl">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
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
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('overview.whatIs.title')}</CardTitle>
              <CardDescription>
                {t('overview.whatIs.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {t('overview.whatIs.p1')}{' '}
                <Link href="/download" className="text-primary underline-offset-4 hover:underline">
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
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('overview.quickLinks.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href="/download"
                className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-3 py-1.5 text-sm hover:bg-accent/60"
              >
                {t('overview.quickLinks.download')}
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-3 py-1.5 text-sm hover:bg-accent/60"
              >
                {t('overview.quickLinks.security')}
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
                  className="border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {Icon && (
                          <Icon
                            className="h-5 w-5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                        <CardTitle className="text-base">{cardTitle}</CardTitle>
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
                          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed">
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
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
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
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-foreground/90">
                {t('security.encryption.warning')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="mt-0 space-y-4 outline-none">
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('tips.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('tips.items.masterPassword')}</li>
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
