'use client'

import Link from 'next/link'
import { Home, RotateCw } from 'lucide-react'
import { MdtStatusPage } from '@/components/mdt-status-page'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <MdtStatusPage
      code="500"
      kicker="Something broke"
      title="Our end hit an unexpected error."
      description={
        error.digest
          ? `Something went wrong on our side. Reference: ${error.digest}`
          : 'Something went wrong on our side. Try again, or head back home.'
      }
      diagnostics={[
        'unhandled exception caught',
        `trace: ${error.digest ?? 'no digest available'}`,
        'action: retry or return home',
      ]}
    >
      <button
        type="button"
        onClick={reset}
        className="mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium"
      >
        <RotateCw className="mr-2 h-4 w-4" />
        Try again
      </button>
      <Link
        href="/"
        className="inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-background/60 px-7 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98]"
      >
        <Home className="mr-2 h-4 w-4" />
        Back home
      </Link>
    </MdtStatusPage>
  )
}
