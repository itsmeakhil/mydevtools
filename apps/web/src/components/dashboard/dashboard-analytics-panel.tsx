'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  fetchDashboardAnalyticsSummary,
  type DashboardAnalyticsSummary,
} from '@/lib/dashboard-analytics-api'
import { cn } from '@/lib/utils'

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string
  value: number
  sub?: string
  className?: string
}) {
  return (
    <Card className={cn('border shadow-sm bg-card/50', className)}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardHeader>
    </Card>
  )
}

export function DashboardAnalyticsPanel() {
  const t = useTranslations('Dashboard.analytics')
  const [data, setData] = useState<DashboardAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await fetchDashboardAnalyticsSummary()
      setData(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="text-sm">{t('title')}</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error || t('loadError')}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('retry')}
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { tasks } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 gap-1.5 text-xs"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('retry')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label={t('passwordEntries')} value={data.passwordEntries} />
        <StatCard label={t('bookmarks')} value={data.bookmarks} />
        <StatCard label={t('bookmarkFolders')} value={data.bookmarkFolders} />
        <StatCard
          label={t('tasksTotal')}
          value={tasks.total}
          sub={`${t('tasksCompleted')}: ${tasks.completed} · ${t('tasksOngoing')}: ${tasks.ongoing} · ${t('tasksNotStarted')}: ${tasks.notStarted}`}
        />
        <StatCard label={t('projects')} value={data.projects} />
        <StatCard label={t('nosqlConnections')} value={data.nosqlConnections} />
        <StatCard label={t('notes')} value={data.notes} />
        <StatCard label={t('apiClientCollections')} value={data.apiClientCollections} />
        <StatCard label={t('apiClientEnvironments')} value={data.apiClientEnvironments} />
        <StatCard label={t('apiClientHistory')} value={data.apiClientHistoryEntries} />
        <StatCard label={t('jsonFormatterDocuments')} value={data.jsonFormatterDocuments} />
      </div>
    </div>
  )
}
