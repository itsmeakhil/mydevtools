'use client'

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { RotateCw } from 'lucide-react'
import { MdtStatusPage } from '@/components/mdt-status-page'
import './globals.css'

// Catches errors thrown in the root layout itself — must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <MdtStatusPage
          code="500"
          kicker="Something broke"
          title="The app failed to load."
          description={
            error.digest
              ? `A critical error occurred. Reference: ${error.digest}`
              : 'A critical error occurred while loading MyDevTools. Try reloading.'
          }
        >
          <button
            type="button"
            onClick={reset}
            className="mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Reload
          </button>
        </MdtStatusPage>
      </body>
    </html>
  )
}
