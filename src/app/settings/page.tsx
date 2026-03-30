'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, Sun, Monitor, Globe, User, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAuth from '@/utils/useAuth'
import { Switch } from '@/components/ui/switch'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { useToolVisibility } from '@/hooks/use-tool-visibility'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const t = useTranslations('SettingsPage')
  const locale = useLocale()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
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
    <div className="flex-1 space-y-8 p-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 bg-background/50">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 opacity-70" />
              {t('userProfile.title')}
            </CardTitle>
            <CardDescription>
              {t('userProfile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || t('userProfile.avatarAlt')} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-medium">{user.displayName || t('userProfile.anonymousUser')}</h3>
                  <p className="text-sm text-muted-foreground">{user.email || t('userProfile.noEmailProvided')}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('userProfile.notLoggedIn')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 opacity-70" />
              {t('tools.title')}
            </CardTitle>
            <CardDescription>
              {t('tools.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {sidebarData.navGroups.flatMap((group: any) => group.items).map((item: any) => {
              const url = typeof item.url === 'string' ? item.url : item.url?.toString() || '';
              if (!url.startsWith('/app/')) return null;
              
              const isEnabled = isToolEnabled(url);
              
              return (
                <div key={url} className="flex items-center justify-between rounded-lg border p-3 bg-background/50 shadow-sm transition-colors hover:bg-accent/30">
                  <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer" onClick={() => toggleTool(url)}>
                    {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                    {item.title}
                  </Label>
                  <Switch 
                    checked={isEnabled} 
                    onCheckedChange={() => toggleTool(url)} 
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 opacity-70" />
              {t('appearance.title')}
            </CardTitle>
            <CardDescription>
              {t('appearance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>{t('appearance.themePreference')}</Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'light' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-6 w-6" />
                  <span>{t('appearance.themes.light')}</span>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'dark' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-6 w-6" />
                  <span>{t('appearance.themes.dark')}</span>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'system' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-6 w-6" />
                  <span>{t('appearance.themes.system')}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 opacity-70" />
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
                <SelectContent rounded-lg>
                  <SelectItem value="en">{t('language.languages.en')}</SelectItem>
                  <SelectItem value="es">{t('language.languages.es')}</SelectItem>
                  <SelectItem value="ca">{t('language.languages.ca')}</SelectItem>
                  <SelectItem value="ar">{t('language.languages.ar')}</SelectItem>
                  <SelectItem value="zh">{t('language.languages.zh')}</SelectItem>
                  <SelectItem value="cs">{t('language.languages.cs')}</SelectItem>
                  <SelectItem value="el">{t('language.languages.el')}</SelectItem>
                  <SelectItem value="de">{t('language.languages.de')}</SelectItem>
                  <SelectItem value="da">{t('language.languages.da')}</SelectItem>
                  <SelectItem value="af">{t('language.languages.af')}</SelectItem>
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
