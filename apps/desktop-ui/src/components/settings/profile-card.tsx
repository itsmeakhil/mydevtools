'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROFILE_UPDATED_EVENT } from '@/hooks/use-app-user'
import { getUserPreferences, patchUserPreferences } from '@/lib/user-preferences-api'

/**
 * Local profile: the name and avatar the app shows you. Stored in local
 * preferences — there is no account and nothing leaves the device.
 */
export function ProfileCard() {
  const t = useTranslations('SettingsPage.userProfile')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  // Draft state so cancelling (or closing the dialog) leaves the saved values alone.
  const [draftName, setDraftName] = useState('')
  const [draftAvatar, setDraftAvatar] = useState('')

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

  const openEditor = () => {
    setDraftName(name)
    setDraftAvatar(avatar)
    setEditing(true)
  }

  const save = async () => {
    const nextName = draftName.trim()
    const nextAvatar = draftAvatar.trim()
    setSaving(true)
    try {
      await patchUserPreferences({
        displayName: nextName || null,
        avatar: nextAvatar || null,
      })
      setName(nextName)
      setAvatar(nextAvatar)
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
      toast.success(t('saved'))
      setEditing(false)
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
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-border">
            {avatar ? <AvatarImage src={avatar} alt={t('avatarAlt')} /> : null}
            <AvatarFallback className="bg-[hsl(var(--surface-3))] text-sm font-semibold">
              {displayName[0]!.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {avatar || t('avatarPlaceholder')}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={openEditor} aria-label={t('edit')} title={t('edit')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('nameLabel')}</Label>
              <Input
                id="profile-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">{t('avatarLabel')}</Label>
              <Input
                id="profile-avatar"
                value={draftAvatar}
                onChange={(e) => setDraftAvatar(e.target.value)}
                placeholder={t('avatarPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
