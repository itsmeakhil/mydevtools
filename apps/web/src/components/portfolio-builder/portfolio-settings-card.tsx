'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Settings2,
  Edit2,
  CheckCircle2,
  Palette,
  Type,
  LayoutGrid,
  Rss,
  Github,
  FileText,
  Check,
} from 'lucide-react'
import { backendFetch } from '@/lib/backend-auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface PortfolioSettings {
  theme?: string | null
  font?: string | null
  accentColor?: string | null
  rssFeedUrl?: string | null
  showGithubStats?: boolean
  resumePdfUrl?: string | null
}

interface PortfolioSettingsCardProps {
  settings: PortfolioSettings
  onChange: (settings: PortfolioSettings) => void
}

const THEMES = [
  { id: 'bento', label: 'Bento Grid', description: 'Modern glassmorphic cards', icon: LayoutGrid },
  { id: 'minimal', label: 'Minimal', description: 'Clean, typography-first', icon: Type },
  { id: 'terminal', label: 'Terminal', description: 'Hacker / CLI aesthetic', icon: FileText },
] as const

const FONTS = [
  { id: 'sans', label: 'Sans Serif', sample: 'Inter / System', className: 'font-sans' },
  { id: 'serif', label: 'Serif', sample: 'Georgia', className: 'font-serif' },
  { id: 'mono', label: 'Monospace', sample: 'Fira Code', className: 'font-mono' },
] as const

const ACCENT_COLORS = [
  { id: '#3b82f6', label: 'Blue', className: 'bg-blue-500' },
  { id: '#8b5cf6', label: 'Violet', className: 'bg-violet-500' },
  { id: '#06b6d4', label: 'Cyan', className: 'bg-cyan-500' },
  { id: '#10b981', label: 'Emerald', className: 'bg-emerald-500' },
  { id: '#f59e0b', label: 'Amber', className: 'bg-amber-500' },
  { id: '#ef4444', label: 'Red', className: 'bg-red-500' },
  { id: '#ec4899', label: 'Pink', className: 'bg-pink-500' },
  { id: '#f97316', label: 'Orange', className: 'bg-orange-500' },
] as const

export function PortfolioSettingsCard({ settings, onChange }: PortfolioSettingsCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<PortfolioSettings>({ ...settings })
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setForm({ ...settings })
    setIsEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_settings: form }),
      })
      if (res.ok) {
        onChange(form)
        setIsEditing(false)
        toast.success('Portfolio settings saved.')
      } else {
        toast.error('Failed to save settings.')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const currentTheme = THEMES.find((t) => t.id === (settings.theme || 'bento'))
  const currentFont = FONTS.find((f) => f.id === (settings.font || 'sans'))

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 opacity-70" />
            Portfolio Settings
          </CardTitle>
          <CardDescription>
            Customize your public portfolio&apos;s appearance and integrations.
          </CardDescription>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={startEditing} className="h-8 gap-2 border">
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-6 max-w-2xl">
            {/* Theme Picker */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LayoutGrid className="h-3 w-3" /> Layout Theme
              </Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {THEMES.map((theme) => {
                  const Icon = theme.icon
                  const isSelected = (form.theme || 'bento') === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: theme.id })}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/50 hover:border-primary/30 hover:bg-accent/20'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <div>
                        <p className="text-xs font-semibold">{theme.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{theme.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Font Picker */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Type className="h-3 w-3" /> Font Family
              </Label>
              <div className="flex gap-2">
                {FONTS.map((font) => {
                  const isSelected = (form.font || 'sans') === font.id
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setForm({ ...form, font: font.id })}
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 py-2.5 transition-all text-center',
                        font.className,
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 hover:border-primary/30'
                      )}
                    >
                      <p className="text-xs font-semibold">{font.label}</p>
                      <p className="text-[10px] text-muted-foreground">{font.sample}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Palette className="h-3 w-3" /> Accent Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => {
                  const isSelected = (form.accentColor || '#3b82f6') === color.id
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setForm({ ...form, accentColor: color.id })}
                      className={cn(
                        'relative h-9 w-9 rounded-full border-2 transition-all',
                        isSelected
                          ? 'border-foreground scale-110 shadow-md'
                          : 'border-transparent hover:border-border hover:scale-105'
                      )}
                      title={color.label}
                    >
                      <span className={cn('block h-full w-full rounded-full', color.className)} />
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center text-white">
                          <Check className="h-3.5 w-3.5 drop-shadow-sm" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* GitHub Stats Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-background/50">
              <div className="flex items-center gap-2.5">
                <Github className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Show GitHub Stats</Label>
                  <p className="text-xs text-muted-foreground">Display contribution chart on profile</p>
                </div>
              </div>
              <Switch
                checked={form.showGithubStats !== false}
                onCheckedChange={(checked) => setForm({ ...form, showGithubStats: checked })}
              />
            </div>

            {/* RSS Feed */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Rss className="h-3 w-3" /> Blog RSS Feed URL
              </Label>
              <Input
                value={form.rssFeedUrl || ''}
                onChange={(e) => setForm({ ...form, rssFeedUrl: e.target.value || null })}
                placeholder="https://dev.to/feed/yourusername"
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Paste your Dev.to, Hashnode, or Medium RSS link to show articles on your public profile.
              </p>
            </div>

            {/* Resume PDF URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Resume PDF URL
              </Label>
              <Input
                value={form.resumePdfUrl || ''}
                onChange={(e) => setForm({ ...form, resumePdfUrl: e.target.value || null })}
                placeholder="https://drive.google.com/..."
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                A direct link to your resume PDF. Visitors can download it from your profile.
              </p>
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={save} disabled={saving} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-background/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Theme</p>
                <p className="text-sm font-medium">{currentTheme?.label || 'Bento Grid'}</p>
              </div>
              <div className="rounded-lg border bg-background/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Font</p>
                <p className="text-sm font-medium">{currentFont?.label || 'Sans Serif'}</p>
              </div>
              <div className="rounded-lg border bg-background/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Accent</p>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full inline-block border"
                    style={{ backgroundColor: settings.accentColor || '#3b82f6' }}
                  />
                  <span className="text-sm font-medium">
                    {ACCENT_COLORS.find((c) => c.id === (settings.accentColor || '#3b82f6'))?.label || 'Blue'}
                  </span>
                </div>
              </div>
            </div>
            {settings.rssFeedUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Rss className="h-3 w-3 shrink-0" />
                <span className="truncate">RSS: {settings.rssFeedUrl}</span>
              </div>
            )}
            {settings.resumePdfUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">Resume: {settings.resumePdfUrl}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
