'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Globe, Palette, Check, Lock } from 'lucide-react'
import { IDLE_TIMEOUT_KEY, getIdleTimeoutMinutes } from '@/lib/use-idle-lock'
import { Switch } from '@/components/ui/switch'
import { getVaultIconsEnabled, setVaultIconsEnabled } from '@/lib/vault-icon-pref'
import { getConsent, setConsent } from '@/lib/telemetry'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { COLOR_THEME_OPTIONS, type ColorTheme, useColorTheme } from '@/hooks/use-color-theme'
import { ProfileCard } from '@/components/settings/profile-card'
import { AppVersionLabel } from '@/components/desktop/app-version-label'
import { useActiveWorkspace } from '@/store/workspace-store'
import { Briefcase } from 'lucide-react'
const colorDisplay: Record<ColorTheme, { swatchClass: string; name: string }> = {
  cyan: { swatchClass: 'bg-cyan-500', name: 'Teal' },
  blue: { swatchClass: 'bg-blue-500', name: 'Blue' },
  indigo: { swatchClass: 'bg-indigo-500', name: 'Indigo' },
  purple: { swatchClass: 'bg-purple-500', name: 'Purple' },
  green: { swatchClass: 'bg-green-500', name: 'Green' },
  orange: { swatchClass: 'bg-orange-500', name: 'Orange' },
  red: { swatchClass: 'bg-red-500', name: 'Red' },
  pink: { swatchClass: 'bg-pink-500', name: 'Pink' },
}

export default function SettingsPage() {
  const t = useTranslations('SettingsPage')
  const locale = useLocale()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()
  const activeWorkspace = useActiveWorkspace()
  const [mounted, setMounted] = useState(false)
  const [idleTimeout, setIdleTimeout] = useState('15')
  const [vaultIcons, setVaultIcons] = useState(false)
  const [telemetry, setTelemetry] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIdleTimeout(String(getIdleTimeoutMinutes()))
    setVaultIcons(getVaultIconsEnabled())
    setTelemetry(getConsent() === 'granted')
  }, [])

  const handleIdleTimeoutChange = (value: string) => {
    window.localStorage.setItem(IDLE_TIMEOUT_KEY, value)
    setIdleTimeout(value)
  }

  if (!mounted) {
    return null // Avoid hydration mismatch
  }

  const handleLanguageChange = (value: string) => {
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 bg-background/50">
      <div className="space-y-1.5">
        {activeWorkspace ? (
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Briefcase className="h-3 w-3 text-primary" />
            <span className="truncate max-w-[160px] sm:max-w-none text-foreground/80">{activeWorkspace.name}</span>
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary to-violet-500" />
            Workspace
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6">

        <ProfileCard />

        <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
                <Sun className="h-4 w-4" />
              </span>
              {t('appearance.title')}
            </CardTitle>
            <CardDescription>
              {t('appearance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="space-y-2 sm:min-w-[180px]">
                <Label>{t('appearance.themePreference')}</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="light">{t('appearance.themes.light')}</SelectItem>
                    <SelectItem value="dark">{t('appearance.themes.dark')}</SelectItem>
                    <SelectItem value="system">{t('appearance.themes.system')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label>Accent color</Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_THEME_OPTIONS.map((color) => {
                    const isSelected = colorTheme === color
                    const { swatchClass, name } = colorDisplay[color]

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setColorTheme(color)}
                        className={cn(
                          'relative h-10 w-10 rounded-full border-2 transition-all',
                          isSelected
                            ? 'border-primary scale-105 shadow-md shadow-primary/25'
                            : 'border-transparent hover:border-border'
                        )}
                        aria-label={`Use ${name} accent color`}
                        aria-pressed={isSelected}
                        title={name}
                      >
                        <span className={cn('block h-full w-full rounded-full', swatchClass)} />
                        {isSelected ? (
                          <span className="absolute inset-0 flex items-center justify-center text-white">
                            <Check className="h-4 w-4 drop-shadow-sm" />
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
                <Lock className="h-4 w-4" />
              </span>
              {t('security.title')}
            </CardTitle>
            <CardDescription>
              {t('security.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-xs">
              <Label>{t('security.autoLock.label')}</Label>
              <Select value={idleTimeout} onValueChange={handleIdleTimeoutChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="0">{t('security.autoLock.never')}</SelectItem>
                  <SelectItem value="5">{t('security.autoLock.min5')}</SelectItem>
                  <SelectItem value="15">{t('security.autoLock.min15')}</SelectItem>
                  <SelectItem value="30">{t('security.autoLock.min30')}</SelectItem>
                  <SelectItem value="60">{t('security.autoLock.min60')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('security.autoLock.helpText')}</p>
            </div>

            {/* Off by default: the icon service learns a domain per saved
                entry, which for a vault is the user's list of accounts. */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="vault-icons">{t('security.vaultIcons.label')}</Label>
                <p className="text-xs text-muted-foreground">{t('security.vaultIcons.helpText')}</p>
              </div>
              <Switch
                id="vault-icons"
                checked={vaultIcons}
                onCheckedChange={(next) => {
                  setVaultIconsEnabled(next)
                  setVaultIcons(next)
                }}
              />
            </div>

            {/* Off until explicitly granted — see lib/telemetry.ts for what
                a granted event actually contains. */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="telemetry">{t('security.telemetry.label')}</Label>
                <p className="text-xs text-muted-foreground">{t('security.telemetry.helpText')}</p>
              </div>
              <Switch
                id="telemetry"
                checked={telemetry}
                onCheckedChange={(next) => {
                  setConsent(next ? 'granted' : 'denied')
                  setTelemetry(next)
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
                <Globe className="h-4 w-4" />
              </span>
              {t('language.title')}
            </CardTitle>
            <CardDescription>
              {t('language.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 max-w-xs">
              <Label>{t('language.selectLanguage')}</Label>
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('language.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="en">{t('language.languages.en')}</SelectItem>
                  <SelectItem value="af">{t('language.languages.af')}</SelectItem>
                  <SelectItem value="ar">{t('language.languages.ar')}</SelectItem>
                  <SelectItem value="ca">{t('language.languages.ca')}</SelectItem>
                  <SelectItem value="cs">{t('language.languages.cs')}</SelectItem>
                  <SelectItem value="da">{t('language.languages.da')}</SelectItem>
                  <SelectItem value="de">{t('language.languages.de')}</SelectItem>
                  <SelectItem value="el">{t('language.languages.el')}</SelectItem>
                  <SelectItem value="es">{t('language.languages.es')}</SelectItem>
                  <SelectItem value="fa">{t('language.languages.fa')}</SelectItem>
                  <SelectItem value="fr">{t('language.languages.fr')}</SelectItem>
                  <SelectItem value="id">{t('language.languages.id')}</SelectItem>
                  <SelectItem value="it">{t('language.languages.it')}</SelectItem>
                  <SelectItem value="ja">{t('language.languages.ja')}</SelectItem>
                  <SelectItem value="ko">{t('language.languages.ko')}</SelectItem>
                  <SelectItem value="ms">{t('language.languages.ms')}</SelectItem>
                  <SelectItem value="nb">{t('language.languages.nb')}</SelectItem>
                  <SelectItem value="nl">{t('language.languages.nl')}</SelectItem>
                  <SelectItem value="pl">{t('language.languages.pl')}</SelectItem>
                  <SelectItem value="pt">{t('language.languages.pt')}</SelectItem>
                  <SelectItem value="pt-BR">{t('language.languages.pt-BR')}</SelectItem>
                  <SelectItem value="ru">{t('language.languages.ru')}</SelectItem>
                  <SelectItem value="sv">{t('language.languages.sv')}</SelectItem>
                  <SelectItem value="tr">{t('language.languages.tr')}</SelectItem>
                  <SelectItem value="uk">{t('language.languages.uk')}</SelectItem>
                  <SelectItem value="vi">{t('language.languages.vi')}</SelectItem>
                  <SelectItem value="zh">{t('language.languages.zh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('language.helpText')}
            </p>
          </CardContent>
        </Card>

        <AppVersionLabel />
      </div>
    </div>
  )
}
