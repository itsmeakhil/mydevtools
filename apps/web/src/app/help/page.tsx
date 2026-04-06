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

const appItems = sidebarData.navGroups.flatMap((g) => g.items)

const appDetails: Record<
  string,
  { howItWorks: string[]; dataNote?: string }
> = {
  '/app/to-do': {
    howItWorks: [
      'Organize work in projects, lists, and tasks with optional Kanban columns.',
      'When you are signed in, tasks sync to your account so they are available across devices.',
    ],
  },
  '/app/notes': {
    howItWorks: [
      'Create rich notes with formatting, blocks, and media-style editing.',
      'Notes are tied to your signed-in account for backup and sync.',
    ],
  },
  '/app/password-manager': {
    howItWorks: [
      'Set a master password once per session to unlock your vault.',
      'Add, edit, search, and generate strong passwords; import/export is available from the manager UI.',
      'Entries are encrypted in your browser before anything sensitive is sent to the server.',
    ],
    dataNote:
      'The server stores only ciphertext and IVs for vault metadata and entries. Your master password is never transmitted.',
  },
  '/app/bookmarks': {
    howItWorks: [
      'Save URLs in folders, edit titles, and open links quickly from the grid.',
      'Signed-in users keep bookmarks synced via the backend.',
    ],
  },
  '/app/json-formatter': {
    howItWorks: [
      'Paste or write JSON, then format, minify, validate, and switch between text and tree views.',
      'Processing runs in the browser; nothing is sent to the server for formatting.',
    ],
  },
  '/app/api-client': {
    howItWorks: [
      'Build HTTP requests with method, URL, query params, headers, and body.',
      'Use environments for variables, save requests into collections, and review history.',
      'When signed in, collections and history sync to your account; without an account, history may use local storage on this device.',
    ],
    dataNote:
      'Requests you send go to the targets you choose. Use the app only with APIs you trust.',
  },
  '/app/nosql-explorer': {
    howItWorks: [
      'Connect to MongoDB using a connection string, browse databases and collections, and run queries.',
      'Saved connections are encrypted with your global master key in the browser; the backend stores ciphertext only.',
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
  return (
    <div className="flex-1 space-y-6 p-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full pt-16 md:pt-8 bg-background/50">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8 opacity-80 shrink-0" aria-hidden />
          Help &amp; documentation
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-3xl">
          How MyDevTools fits together, what each app does, and how security and encryption protect your
          data.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="apps" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Apps
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Tips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4 outline-none">
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>What is MyDevTools?</CardTitle>
              <CardDescription>
                A signed-in developer workspace: a dashboard and a set of tools for everyday tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                After you sign in with your account, the app establishes a session with the MyDevTools API
                so tools can load and save your data. The sidebar lists every app; you can hide tools you
                do not use from{' '}
                <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
                  Settings
                </Link>
                .
              </p>
              <p>
                Some features use a <strong className="text-foreground font-medium">master password</strong>{' '}
                (or global vault key) so that secrets like passwords and database connection strings are
                encrypted on your device before they reach the server.
              </p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-3 py-1.5 text-sm hover:bg-accent/60"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-3 py-1.5 text-sm hover:bg-accent/60"
              >
                Settings
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="mt-0 space-y-4 outline-none">
          <p className="text-sm text-muted-foreground">
            Open any tool from the sidebar or dashboard. Below is a short guide per app.
          </p>
          <div className="grid gap-4">
            {appItems.map((item) => {
              const url = typeof item.url === 'string' ? item.url : String(item.url)
              const Icon = item.icon
              const extra = appDetails[url]
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
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <Link
                        href={url}
                        className={cn(
                          'inline-flex items-center gap-1 shrink-0 text-xs font-medium text-primary',
                          'underline-offset-4 hover:underline'
                        )}
                      >
                        Open
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {extra ? (
                      <>
                        <SectionTitle>How it works</SectionTitle>
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
                      <p>Use this tool from the sidebar for its dedicated workflow.</p>
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
              <CardTitle>Sign-in and API session</CardTitle>
              <CardDescription>Identity and how the browser talks to your backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground font-medium">Authentication</strong> uses Firebase for
                  sign-in. After login, the app exchanges your Firebase ID token for API cookies.
                </li>
                <li>
                  <strong className="text-foreground font-medium">Access tokens</strong> are JWTs signed on
                  the server (HS256). They prove which user is calling the API.
                </li>
                <li>
                  <strong className="text-foreground font-medium">Refresh tokens</strong> are stored in
                  HttpOnly cookies; the server stores a SHA-256 hash of the refresh token, not the raw
                  token.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Encryption you should know about</CardTitle>
              <CardDescription>Client-side crypto for vault and sensitive connection data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                For the <strong className="text-foreground font-medium">password manager</strong> and{' '}
                <strong className="text-foreground font-medium">NoSQL Explorer</strong> saved connections,
                the web app uses the browser{' '}
                <strong className="text-foreground font-medium">Web Crypto API</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground font-medium">PBKDF2</strong> with{' '}
                  <strong className="text-foreground font-medium">SHA-256</strong>,{' '}
                  <strong className="text-foreground font-medium">100,000</strong> iterations, and a random
                  salt derives a 256-bit key from your master password.
                </li>
                <li>
                  <strong className="text-foreground font-medium">AES-256-GCM</strong> encrypts payloads; a
                  random <strong className="text-foreground font-medium">12-byte IV</strong> is used per
                  encryption.
                </li>
                <li>
                  The derived key stays in the browser (non-extractable). The server receives{' '}
                  <strong className="text-foreground font-medium">ciphertext and IVs</strong>, not your master
                  password or plaintext secrets.
                </li>
              </ul>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-foreground/90">
                If you forget the master password, encrypted data cannot be recovered. Store it safely.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Logout and local data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Logging out clears in-memory secrets, vault-related state, and master key material from
                IndexedDB where applicable, and ends the API session. Anything kept only in local storage
                on a device may remain until you clear it in the browser.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="mt-0 space-y-4 outline-none">
          <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Using MyDevTools safely</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>Use a strong, unique master password for vault features.</li>
                <li>
                  Treat the API Client like any HTTP client: avoid pasting production secrets into shared
                  environments unless you understand who can see them.
                </li>
                <li>
                  NoSQL Explorer connects to databases you configure; use least-privilege users and network
                  rules where possible.
                </li>
                <li>JSON Formatter is local to the browser—still avoid pasting highly sensitive data on shared machines.</li>
                <li>Customize visible tools in Settings to keep the sidebar focused.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
