'use client'

import { useState } from 'react'
import Link from 'next/link'
import { History, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ActivityLogPanel } from './activity-log-panel'

/**
 * Right-side slide-over showing recent activity, reusing ActivityLogPanel in its
 * embedded variant. The full `/dashboard/activity` route stays as a deep link
 * via the footer "View all" link.
 */
export function ActivityLogDrawer() {
  const t = useTranslations('Dashboard.activity')
  const tDash = useTranslations('Dashboard')
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 sm:text-sm"
        >
          <History className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="hidden sm:inline">{tDash('viewActivity')}</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 py-4">
          <ActivityLogPanel embedded />
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Link
              href="/dashboard/activity"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              {t('viewAll')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
