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
import { Button } from '@/components/ui/button'
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
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 px-2.5">
          <History className="text-muted-foreground" aria-hidden />
          <span className="hidden sm:inline">{tDash('viewActivity')}</span>
        </Button>
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
            <Button variant="outline" asChild className="w-full gap-1.5">
              <Link href="/dashboard/activity">
                {t('viewAll')}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
