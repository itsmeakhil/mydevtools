'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Loader2, Palette, Globe, LayoutGrid, Heart, BarChart3, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getUserPreferences, type UserPreferencesOut } from '@/lib/user-preferences-api'

export function DashboardUiPanel() {
  const t = useTranslations('Dashboard.ui')
  const tNav = useTranslations('Navigation')
  const [prefs, setPrefs] = useState<UserPreferencesOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserPreferences()
      setPrefs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'))
      setPrefs(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !prefs) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="text-sm">{t('title')}</span>
      </div>
    )
  }

  if (error && !prefs) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!prefs) return null

  const usageKeys = Object.keys(prefs.toolStats || {}).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" asChild className="gap-2 shrink-0">
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            {tNav('settings')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Palette className="h-4 w-4" />
              <CardDescription>{t('theme')}</CardDescription>
            </div>
            <CardTitle className="text-base capitalize">{prefs.theme}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Palette className="h-4 w-4" />
              <CardDescription>{t('accent')}</CardDescription>
            </div>
            <CardTitle className="text-base">{prefs.accentColor}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <CardDescription>{t('locale')}</CardDescription>
            </div>
            <CardTitle className="text-base">{prefs.locale}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LayoutGrid className="h-4 w-4" />
              <CardDescription>{t('enabledTools')}</CardDescription>
            </div>
            <CardTitle className="text-2xl tabular-nums">{prefs.enabledTools?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4" />
              <CardDescription>{t('favoriteTools')}</CardDescription>
            </div>
            <CardTitle className="text-2xl tabular-nums">{prefs.toolFavorites?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <CardDescription>{t('toolsWithUsage')}</CardDescription>
            </div>
            <CardTitle className="text-2xl tabular-nums">{usageKeys}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
