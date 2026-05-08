'use client'

import React from 'react'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface DashboardLoginCtaProps {
  user: { displayName?: string | null } | null
  searchQuery: string
}

/**
 * Non-auth CTA panel — shown when the user is logged out and not searching.
 * Displays blurred ghost cards with a sign-in overlay.
 */
export function DashboardLoginCta({ user, searchQuery }: DashboardLoginCtaProps) {
  const t = useTranslations('Dashboard')

  if (user || searchQuery) return null

  return (
    <div className="relative rounded-2xl border border-border/40 overflow-hidden">
      {/* Ghost cards preview */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pointer-events-none select-none"
        aria-hidden
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3 blur-[2px] opacity-60"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10" />
            <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
            <div className="h-2.5 w-full rounded bg-muted-foreground/10" />
            <div className="h-2.5 w-2/3 rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LogIn size={20} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs px-4">
          {t('loginCta.description')}
        </p>
        <Button size="sm" className="rounded-xl shadow-sm" asChild>
          <Link href="/login">{t('signIn')}</Link>
        </Button>
      </div>
    </div>
  )
}
