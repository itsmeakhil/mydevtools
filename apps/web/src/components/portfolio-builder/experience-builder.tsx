'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Briefcase,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  Building2,
  GripVertical,
  MapPin,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { backendFetch } from '@/lib/backend-auth'
import { toast } from 'sonner'
import { TechStackPicker, TECH_CATALOG } from '@/components/tech-stack-picker'
import { MonthPicker, PRESENT_VALUE } from '@/components/ui/month-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Apprenticeship'] as const

export interface Experience {
  id: string
  company: string
  role: string
  startDate: string
  endDate?: string | null
  description?: string | null
  technologies: string[]
  employmentType?: string | null
  location?: string | null
}

interface ExperienceBuilderProps {
  experiences: Experience[]
  onChange: (experiences: Experience[]) => void
}

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const emptyExperience: Omit<Experience, 'id'> = {
  company: '',
  role: '',
  startDate: '',
  endDate: null,
  description: null,
  technologies: [],
  employmentType: null,
  location: null,
}

function fmtMonth(val: string): string {
  if (!val) return ''
  if (val === PRESENT_VALUE) return 'Present'
  if (/^\d{4}-\d{2}$/.test(val)) {
    const [y, m] = val.split('-')
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }
  return val
}

function ExperienceForm({
  experience,
  onSave,
  onCancel,
}: {
  experience: Experience
  onSave: (exp: Experience) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Experience>({ ...experience })
  const isValid = form.company.trim() && form.role.trim() && form.startDate.trim()

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Company *</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Google" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Role *</Label>
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Senior Software Engineer" className="h-9" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Start Date *</Label>
          <MonthPicker value={form.startDate} onChange={(val) => setForm({ ...form, startDate: val })} placeholder="Pick start month" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
          <MonthPicker value={form.endDate || ''} onChange={(val) => setForm({ ...form, endDate: val || null })} placeholder="Pick end month" allowPresent />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Employment Type</Label>
          <Select value={form.employmentType || ''} onValueChange={(val) => setForm({ ...form, employmentType: val || null })}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Location
          </Label>
          <Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value || null })} placeholder="e.g. Remote, New York, NY" className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
        <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} placeholder="What did you accomplish?" className="min-h-[80px] resize-none" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Technologies</Label>
        <TechStackPicker value={form.technologies} onChange={(techs) => setForm({ ...form, technologies: techs })} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button onClick={() => isValid && onSave(form)} disabled={!isValid} className="gap-2" size="sm">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button variant="outline" onClick={onCancel} size="sm">Cancel</Button>
      </div>
    </div>
  )
}

function SortableExperienceItem({
  experience,
  onEdit,
  onDelete,
}: {
  experience: Experience
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: experience.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex gap-3 rounded-lg border bg-background/50 p-4 transition-colors hover:bg-accent/20 ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center pt-1 ml-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex-1 w-px bg-border/50" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{experience.role}</h4>
            <p className="text-sm text-muted-foreground">{experience.company}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7"><Edit2 className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtMonth(experience.startDate)} — {experience.endDate ? fmtMonth(experience.endDate) : 'Present'}
          </span>
          {experience.employmentType && <span>{experience.employmentType}</span>}
          {experience.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {experience.location}
            </span>
          )}
        </div>
        {experience.description && (
          <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{experience.description}</p>
        )}
        {experience.technologies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {experience.technologies.map((tech) => {
              const meta = TECH_CATALOG.find((t) => t.name === tech)
              const src = meta ? (meta.iconUrl ?? `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`) : null
              return (
                <Badge key={tech} variant="secondary" className="gap-1.5 text-[10px] px-1.5 py-0">
                  {src && <img src={src} alt={tech} width={10} height={10} className="w-2.5 h-2.5 object-contain shrink-0" />}
                  {tech}
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function ExperienceBuilder({ experiences, onChange }: ExperienceBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [saving, setSaving] = useState(false)

  const count = experiences.length
  const summary = count === 0 ? 'No positions added' : `${count} position${count !== 1 ? 's' : ''}`

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const persist = async (updated: Experience[], successMsg?: string) => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiences: updated }),
      })
      if (res.ok) {
        onChange(updated)
        if (successMsg) toast.success(successMsg)
      } else {
        toast.error('Failed to save experience.')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = experiences.findIndex((e) => e.id === active.id)
      const newIndex = experiences.findIndex((e) => e.id === over.id)
      persist(arrayMove(experiences, oldIndex, newIndex))
    }
  }

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1 flex-1 min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 opacity-70" />
            Work Experience
          </CardTitle>
          {isCollapsed
            ? <p className="text-xs text-muted-foreground">{summary}</p>
            : <CardDescription>Your professional journey and career highlights.</CardDescription>
          }
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {!isAdding && !editingId && (
            <Button variant="ghost" size="icon" onClick={() => { setIsCollapsed(false); setIsAdding(true) }} className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={saving}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsed && 'rotate-180')} />
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && <CardContent className="pt-4 space-y-3">
        {isAdding && (
          <ExperienceForm
            experience={{ id: generateId(), ...emptyExperience }}
            onSave={(exp) => { persist([...experiences, exp], 'Experience added.'); setIsAdding(false) }}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {experiences.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground italic">No work experience added yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={experiences.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {experiences.map((exp) =>
                  editingId === exp.id ? (
                    <ExperienceForm
                      key={exp.id}
                      experience={exp}
                      onSave={(updated) => { persist(experiences.map((e) => e.id === updated.id ? updated : e), 'Experience updated.'); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <SortableExperienceItem
                      key={exp.id}
                      experience={exp}
                      onEdit={() => setEditingId(exp.id)}
                      onDelete={() => persist(experiences.filter((e) => e.id !== exp.id), 'Experience removed.')}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>}
    </Card>
  )
}
