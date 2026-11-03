'use client'

import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Moon, Monitor, Globe, Palette, Lock, User, Archive } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IDLE_TIMEOUT_KEY, getIdleTimeoutMinutes } from '@/lib/use-idle-lock'
import { Switch } from '@/components/ui/switch'
import { getVaultIconsEnabled, setVaultIconsEnabled } from '@/lib/vault-icon-pref'
import { getReduceTransparency, setReduceTransparency } from '@/lib/reduce-transparency'
import { getConsent, setConsent } from '@/lib/telemetry'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useColorTheme } from '@/hooks/use-color-theme'
import { ACCENT_PRESETS, accentHex, isCustomAccent } from '@/lib/accent-color'
import { ProfileCard } from '@/components/settings/profile-card'
import { AccentColorPicker } from '@/components/settings/accent-color-picker'
import { AppVersionLabel } from '@/components/desktop/app-version-label'
import { FactoryResetCard } from '@/components/desktop/factory-reset-card'
import { BackupRestoreCard } from '@/components/desktop/backup-restore-card'
import { BackupCodesCard } from '@/components/settings/backup-codes-card'
import { SettingsGroup, SettingsRow } from '@/components/settings/settings-group'
import { useActiveWorkspace } from '@/store/workspace-store'
import { Briefcase } from 'lucide-react'

// Segmented-control item for the theme picker (matches the TabsList look).
const THEME_ITEM =
  'h-7 min-w-0 rounded-[7px] px-2.5 text-muted-foreground hover:bg-transparent data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-elev-1'

export default function SettingsPage() {
  const t = useTranslations('SettingsPage')
  const locale = useLocale()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()
  const tShell = useTranslations('Shell')
  const [reduceTransparency, setReduceTransparencyState] = useState(false)
  useEffect(() => setReduceTransparencyState(getReduceTransparency()), [])
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

  const customAccent = isCustomAccent(colorTheme)

  const handleLanguageChange = (value: string) => {
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="flex-1 w-full max-w-[720px] mx-auto space-y-6 p-6 md:p-8 pt-20 lg:pt-8">
      <div className="space-y-1">
        {activeWorkspace ? (
          <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="truncate max-w-[160px] sm:max-w-none">{activeWorkspace.name}</span>
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">Workspace</p>
        )}
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 h-auto flex-wrap justify-start">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            {t('userProfile.title')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t('appearance.title')}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            {t('security.title')}
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            {t('backup.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 space-y-6">
          <ProfileCard />
        </TabsContent>

        <TabsContent value="appearance" className="mt-0 space-y-6">
          <SettingsGroup title={t('appearance.title')} footer={t('appearance.description')}>
            <SettingsRow label={<Label>{t('appearance.themePreference')}</Label>}>
              {/* Single-select toggles deselect on re-click: ignore the empty value
                  so there is always an active theme. */}
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => value && setTheme(value)}
                className="justify-start gap-0 rounded-[10px] bg-foreground/[0.06] p-[3px]"
              >
                <ToggleGroupItem value="light" className={THEME_ITEM} aria-label={t('appearance.themes.light')} title={t('appearance.themes.light')}>
                  <Sun className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" className={THEME_ITEM} aria-label={t('appearance.themes.dark')} title={t('appearance.themes.dark')}>
                  <Moon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="system" className={THEME_ITEM} aria-label={t('appearance.themes.system')} title={t('appearance.themes.system')}>
                  <Monitor className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </SettingsRow>

            <SettingsRow
              label={<Label htmlFor="reduce-transparency">{tShell('reduceTransparency')}</Label>}
              description={tShell('reduceTransparencyHint')}
            >
              <Switch
                id="reduce-transparency"
                checked={reduceTransparency}
                onCheckedChange={(on) => {
                  setReduceTransparencyState(on)
                  setReduceTransparency(on)
                }}
              />
            </SettingsRow>

            <SettingsRow
              label={
                <div className="flex h-5 items-center gap-2">
                  <Palette className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Label>{t('appearance.accentColor')}</Label>
                </div>
              }
            >
              <div className="sm:w-[220px]">
                <div className="flex items-center gap-2">
                  {/* Trigger is w-full by default: flex-1 keeps it from squeezing the
                      picker swatch out of the row. */}
                  <Select value={colorTheme} onValueChange={setColorTheme}>
                    <SelectTrigger className="flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {/* Custom picks are not in the preset list; keep one item so the
                          trigger can render the active hex. */}
                      {customAccent ? (
                        <SelectItem value={colorTheme}>
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: accentHex(colorTheme) }}
                          />
                          <span className="font-mono">{accentHex(colorTheme)}</span>
                        </SelectItem>
                      ) : null}
                      {ACCENT_PRESETS.map(({ id, name, hex }) => (
                        <SelectItem key={id} value={id}>
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: hex }}
                          />
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <AccentColorPicker
                    colorTheme={colorTheme}
                    onChange={setColorTheme}
                    label={t('appearance.customColor')}
                  />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              label={
                <div className="flex h-5 items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Label>{t('language.selectLanguage')}</Label>
                </div>
              }
            >
              <div className="sm:w-[220px]">
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
            </SettingsRow>
          </SettingsGroup>
        </TabsContent>

        <TabsContent value="security" className="mt-0 space-y-6">
          <SettingsGroup title={t('security.title')} footer={t('security.description')}>
            <SettingsRow
              label={<Label>{t('security.autoLock.label')}</Label>}
              description={t('security.autoLock.helpText')}
            >
              <Select value={idleTimeout} onValueChange={handleIdleTimeoutChange}>
                <SelectTrigger className="sm:w-[180px]">
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
            </SettingsRow>

            {/* Off by default: the icon service learns a domain per saved
                entry, which for a vault is the user's list of accounts. */}
            <SettingsRow
              label={<Label htmlFor="vault-icons">{t('security.vaultIcons.label')}</Label>}
              description={t('security.vaultIcons.helpText')}
            >
              <Switch
                id="vault-icons"
                checked={vaultIcons}
                onCheckedChange={(next) => {
                  setVaultIconsEnabled(next)
                  setVaultIcons(next)
                }}
              />
            </SettingsRow>

            {/* Off until explicitly granted — see lib/telemetry.ts for what
                a granted event actually contains. */}
            <SettingsRow
              label={<Label htmlFor="telemetry">{t('security.telemetry.label')}</Label>}
              description={t('security.telemetry.helpText')}
            >
              <Switch
                id="telemetry"
                checked={telemetry}
                onCheckedChange={(next) => {
                  setConsent(next ? 'granted' : 'denied')
                  setTelemetry(next)
                }}
              />
            </SettingsRow>
          </SettingsGroup>

          <BackupCodesCard />
        </TabsContent>

        <TabsContent value="data" className="mt-0 space-y-6">
          <BackupRestoreCard />
          <FactoryResetCard />
          <AppVersionLabel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
