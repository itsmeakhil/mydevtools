'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, Sun, Monitor, Globe, User, List, Palette, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { useToolVisibility } from '@/hooks/use-tool-visibility'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { COLOR_THEME_OPTIONS, type ColorTheme, useColorTheme } from '@/hooks/use-color-theme'
import { getToolMessageKey } from '@/lib/tool-i18n'
import { PasskeySection } from '@/components/settings/passkey-section'
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
  const tNav = useTranslations('Navigation')
  const locale = useLocale()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()
  const { isToolEnabled, toggleTool } = useToolVisibility()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary to-violet-500" />
          Workspace
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6">

        <PasskeySection />

        <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
                <List className="h-4 w-4" />
              </span>
              {t('tools.title')}
            </CardTitle>
            <CardDescription>
              {t('tools.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sidebarData.navGroups.map((group: any) => {
              const groupTools = group.items.filter((item: any) => {
                const url = typeof item.url === 'string' ? item.url : item.url?.toString() || '';
                return url.startsWith('/app/');
              });
              if (groupTools.length === 0) return null;

              return (
                <Collapsible key={group.title} className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      {group.icon && <group.icon className="h-4 w-4 text-muted-foreground" />}
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h4>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-2 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <span>
                          {groupTools.filter((t: any) => isToolEnabled(typeof t.url === 'string' ? t.url : t.url?.toString() || '')).length} / {groupTools.length} active
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="grid gap-3 sm:grid-cols-2 pt-2 transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    {groupTools.map((item: any) => {
                      const url = typeof item.url === 'string' ? item.url : item.url?.toString() || '';
                      const isEnabled = isToolEnabled(url);
                      const toolKey = getToolMessageKey(url);
                      const label = toolKey ? tNav(toolKey as never) : item.title;

                      return (
                        <div key={url} className="flex items-center justify-between rounded-lg border p-3 bg-background/50 shadow-sm transition-colors hover:bg-accent/30">
                          <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer" onClick={() => toggleTool(url)}>
                            {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                            {label}
                          </Label>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleTool(url)}
                          />
                        </div>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

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
      </div>
    </div>
  )
}
