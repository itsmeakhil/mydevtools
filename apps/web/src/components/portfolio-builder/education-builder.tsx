'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  GraduationCap,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  School,
  GripVertical,
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
import { MonthPicker, PRESENT_VALUE } from '@/components/ui/month-picker'

export interface Education {
  id: string
  institution: string
  degree: string
  startDate: string
  endDate?: string | null
  description?: string | null
}

interface EducationBuilderProps {
  education: Education[]
  onChange: (education: Education[]) => void
}

function generateId(): string {
  return `edu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const emptyEducation: Omit<Education, 'id'> = {
  institution: '',
  degree: '',
  startDate: '',
  endDate: null,
  description: null,
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

function EducationForm({
  education,
  onSave,
  onCancel,
}: {
  education: Education
  onSave: (edu: Education) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Education>({ ...education })
  const isValid = form.institution.trim() && form.degree.trim() && form.startDate.trim()

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Institution *</Label>
          <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. MIT" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Degree *</Label>
          <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="e.g. B.S. Computer Science" className="h-9" />
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
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
        <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} placeholder="GPA, honours, relevant coursework, etc." className="min-h-[80px] resize-none" />
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

function SortableEducationItem({
  education,
  onEdit,
  onDelete,
}: {
  education: Education
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: education.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex gap-3 rounded-lg border bg-background/50 p-4 transition-colors hover:bg-accent/20 ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center pt-1 ml-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <School className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 flex-1 w-px bg-border/50" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{education.degree}</h4>
            <p className="text-sm text-muted-foreground">{education.institution}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7"><Edit2 className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{fmtMonth(education.startDate)}</span>
          <span>—</span>
          <span>{education.endDate ? fmtMonth(education.endDate) : 'Present'}</span>
        </div>
        {education.description && (
          <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{education.description}</p>
        )}
      </div>
    </div>
  )
}

export function EducationBuilder({ education, onChange }: EducationBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const persist = async (updated: Education[], successMsg?: string) => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ education: updated }),
      })
      if (res.ok) {
        onChange(updated)
        if (successMsg) toast.success(successMsg)
      } else {
        toast.error('Failed to save education.')
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
      const oldIndex = education.findIndex((e) => e.id === active.id)
      const newIndex = education.findIndex((e) => e.id === over.id)
      persist(arrayMove(education, oldIndex, newIndex))
    }
  }

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 opacity-70" />
            Education
          </CardTitle>
          <CardDescription>Your academic background and certifications.</CardDescription>
        </div>
        {!isAdding && !editingId && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="h-8 gap-2 border" disabled={saving}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {isAdding && (
          <EducationForm
            education={{ id: generateId(), ...emptyEducation }}
            onSave={(edu) => { persist([...education, edu], 'Education added.'); setIsAdding(false) }}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {education.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground italic">No education added yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {education.map((edu) =>
                  editingId === edu.id ? (
                    <EducationForm
                      key={edu.id}
                      education={edu}
                      onSave={(updated) => { persist(education.map((e) => e.id === updated.id ? updated : e), 'Education updated.'); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <SortableEducationItem
                      key={edu.id}
                      education={edu}
                      onEdit={() => setEditingId(edu.id)}
                      onDelete={() => persist(education.filter((e) => e.id !== edu.id), 'Education removed.')}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
