'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  UserCircle,
  Edit2,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Flag,
  Languages,
  Heart,
  X,
  Briefcase,
  ChevronDown,
} from 'lucide-react'
import { backendFetch } from '@/lib/backend-auth'
import { toast } from 'sonner'
import { DOBPicker } from '@/components/ui/dob-picker'
import { cn } from '@/lib/utils'
import { TagInput } from './tag-input'
import { LanguagePicker } from './language-picker'
import { type PersonalInfo, type LanguageEntry } from './personal-info-types'

export { LANGUAGE_LEVELS } from './personal-info-types'
export type { LanguageEntry, PersonalInfo } from './personal-info-types'

interface PersonalInfoCardProps {
  info: PersonalInfo
  onChange: (info: PersonalInfo) => void
  flat?: boolean
}

const empty: PersonalInfo = {
  phone: null,
  location: null,
  date_of_birth: null,
  nationality: null,
  headline: null,
  languages: [],
  hobbies: [],
}

export function PersonalInfoCard({ info, onChange, flat = false }: PersonalInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [form, setForm] = useState<PersonalInfo>({ ...empty, ...info })
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setForm({ ...empty, ...info })
    setIsEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_info: form }),
      })
      if (res.ok) {
        onChange(form)
        setIsEditing(false)
        toast.success('Personal info saved.')
      } else {
        toast.error('Failed to save personal info.')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const filledFields = [
    info.phone, info.location, info.date_of_birth, info.nationality, info.headline,
    ...(info.languages?.map((l) => l.name) ?? []), ...(info.hobbies ?? []),
  ].filter(Boolean)

  const summary = [info.headline, info.location, info.phone].filter(Boolean).join(' · ') ||
    (filledFields.length > 0 ? `${filledFields.length} field${filledFields.length !== 1 ? 's' : ''} filled` : 'Not set')

  const header = (
    <div className="flex items-center justify-between px-5 pt-4 pb-3">
      <div className="space-y-0.5 flex-1 min-w-0">
        <p className="font-semibold text-sm flex items-center gap-2">
          <UserCircle className="h-4 w-4 opacity-60" />
          Personal Info
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isCollapsed ? summary : 'Contact details, languages, hobbies.'}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 ml-2">
        {!isCollapsed && !isEditing && (
          <Button variant="ghost" size="icon" onClick={startEditing} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsed && 'rotate-180')} />
        </Button>
      </div>
    </div>
  )

  const body = (
    <div className="px-5 pb-5">
      {isEditing ? (
        <div className="space-y-5 max-w-2xl">
          {/* Headline */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Professional</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" /> Headline / Job Title
              </Label>
              <Input
                value={form.headline || ''}
                onChange={(e) => setForm({ ...form, headline: e.target.value || null })}
                placeholder="e.g. Senior Frontend Engineer"
                className="h-9"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                  placeholder="+1 234 567 8900"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Location
                </Label>
                <Input
                  value={form.location || ''}
                  onChange={(e) => setForm({ ...form, location: e.target.value || null })}
                  placeholder="San Francisco, CA"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Personal */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Personal</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Date of Birth
                </Label>
                <DOBPicker
                  value={form.date_of_birth || ''}
                  onChange={(val) => setForm({ ...form, date_of_birth: val || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flag className="h-3 w-3" /> Nationality
                </Label>
                <Input
                  value={form.nationality || ''}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value || null })}
                  placeholder="e.g. American"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Languages</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Languages className="h-3 w-3" /> Spoken languages
              </Label>
              <LanguagePicker
                value={form.languages}
                onChange={(v) => setForm({ ...form, languages: v })}
              />
            </div>
          </div>

          {/* Hobbies */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hobbies & Interests</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-3 w-3" /> What you enjoy outside of work
              </Label>
              <TagInput
                value={form.hobbies}
                onChange={(v) => setForm({ ...form, hobbies: v })}
                placeholder="e.g. Hiking, Photography…"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving} size="sm" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : filledFields.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No personal info added yet.</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {info.headline && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground/60" />
              {info.headline}
            </span>
          )}
          {(info.phone || info.location) && (
            <div className="flex flex-wrap gap-4">
              {info.phone && (
                <span className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {info.phone}
                </span>
              )}
              {info.location && (
                <span className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {info.location}
                </span>
              )}
            </div>
          )}
          {(info.date_of_birth || info.nationality) && (
            <div className="flex flex-wrap gap-4">
              {info.date_of_birth && (
                <span className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {new Date(info.date_of_birth).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {info.nationality && (
                <span className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {info.nationality}
                </span>
              )}
            </div>
          )}
          {(info.languages?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Languages className="h-3 w-3" /> Languages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {info.languages.map((lang) => (
                  <Badge key={lang.name} variant="secondary" className="text-xs gap-1">
                    {lang.name}
                    <span className="text-muted-foreground/70">· {lang.level}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {(info.hobbies?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-3 w-3" /> Hobbies & Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {info.hobbies.map((h) => (
                  <Badge key={h} variant="outline" className="text-xs gap-1">{h}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (flat) {
    return (
      <>
        {header}
        {!isCollapsed && body}
      </>
    )
  }

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
      {header}
      {!isCollapsed && <CardContent className="pt-0">{body}</CardContent>}
    </Card>
  )
}
