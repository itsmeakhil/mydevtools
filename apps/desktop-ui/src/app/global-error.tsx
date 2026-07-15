'use client'

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { RotateCw } from 'lucide-react'
import './globals.css'

// Catches errors thrown in the root layout itself — must render its own <html>/<body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Try reloading.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md border px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
