'use client'

import type { ReactNode } from 'react'

/**
 * Calm, theme-aware status page (404 and friends). Follows the app tokens so it
 * matches light/dark like the rest of the window — no forced dark deck.
 * `diagnostics` is still accepted for call-site compatibility but not rendered.
 */
export function MdtStatusPage({
  code,
  kicker,
  title,
  description,
  diagnostics: _diagnostics,
  children,
}: {
  code: ReactNode
  kicker: string
  title: string
  description: string
  diagnostics?: string[]
  children?: ReactNode
}) {
  return (
    <div className="chrome flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="text-6xl font-semibold leading-none tracking-[-0.02em] text-muted-foreground/40 tabular-nums">
        {code}
      </div>
      <p className="mt-4 text-[13px] font-medium text-muted-foreground">{kicker}</p>
      <h1 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {children}
      </div>
    </div>
  )
}
