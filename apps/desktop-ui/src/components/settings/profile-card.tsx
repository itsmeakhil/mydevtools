'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROFILE_UPDATED_EVENT } from '@/hooks/use-app-user'
import { getUserPreferences, patchUserPreferences } from '@/lib/user-preferences-api'
import { DesktopUpdateDialog } from '@/components/desktop/desktop-update-dialog'

/**
 * Local profile: the name and avatar the app shows you. Stored in local
 * preferences — there is no account and nothing leaves the device.
 */
export function ProfileCard() {
  const t = useTranslations('SettingsPage.userProfile')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void getUserPreferences()
      .then((prefs) => {
        setName(prefs.displayName || '')
        setAvatar(prefs.avatar || '')
      })
      .catch(() => {
        // Store unavailable — leave the fields empty rather than blocking settings.
      })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await patchUserPreferences({
        displayName: name.trim() || null,
        avatar: avatar.trim() || null,
      })
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
      toast.success(t('saved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const displayName = name.trim() || t('anonymousUser')

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <UserRound className="h-4 w-4" />
          </span>
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-border">
            {avatar ? <AvatarImage src={avatar} alt={t('avatarAlt')} /> : null}
            <AvatarFallback className="bg-[hsl(var(--surface-3))] text-sm font-semibold">
              {displayName[0]!.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('nameLabel')}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">{t('avatarLabel')}</Label>
              <Input
                id="profile-avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder={t('avatarPlaceholder')}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {t('save')}
          </Button>
          <DesktopUpdateDialog />
        </div>
      </CardContent>
    </Card>
  )
}
