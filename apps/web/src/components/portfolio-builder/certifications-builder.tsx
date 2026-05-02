'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Award,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
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
import { MonthPicker } from '@/components/ui/month-picker'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface Certification {
  id: string
  name: string
  issuer: string
  issueDate?: string | null
  expiryDate?: string | null
  credentialUrl?: string | null
}

interface CertificationsBuilderProps {
  certifications: Certification[]
  onChange: (certifications: Certification[]) => void
  flat?: boolean
}

function generateId(): string {
  return `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const emptyCertification: Omit<Certification, 'id'> = {
  name: '',
  issuer: '',
  issueDate: null,
  expiryDate: null,
  credentialUrl: null,
}

function fmtMonth(val: string): string {
  if (!val) return ''
  if (/^\d{4}-\d{2}$/.test(val)) {
    const [y, m] = val.split('-')
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }
  return val
}

function CertificationForm({
  certification,
  onSave,
  onCancel,
}: {
  certification: Certification
  onSave: (cert: Certification) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Certification>({ ...certification })
  const isValid = form.name.trim() && form.issuer.trim()

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Certification Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AWS Solutions Architect" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Issuing Organization *</Label>
          <Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g. Amazon Web Services" className="h-9" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Issue Date</Label>
          <MonthPicker value={form.issueDate || ''} onChange={(val) => setForm({ ...form, issueDate: val || null })} placeholder="Pick issue month" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Expiry Date</Label>
          <MonthPicker value={form.expiryDate || ''} onChange={(val) => setForm({ ...form, expiryDate: val || null })} placeholder="Pick expiry month (optional)" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3" /> Credential URL
        </Label>
        <Input value={form.credentialUrl || ''} onChange={(e) => setForm({ ...form, credentialUrl: e.target.value || null })} placeholder="https://..." className="h-9" />
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

function SortableCertificationItem({
  certification,
  onEdit,
  onDelete,
}: {
  certification: Certification
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: certification.id })

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
          <Award className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{certification.name}</h4>
              {certification.credentialUrl && (
                <a href={certification.credentialUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{certification.issuer}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7"><Edit2 className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
        {(certification.issueDate || certification.expiryDate) && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {certification.issueDate && <span>{fmtMonth(certification.issueDate)}</span>}
            {certification.expiryDate && (
              <>
                <span>—</span>
                <span>Expires {fmtMonth(certification.expiryDate)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CertificationsBuilder({ certifications, onChange, flat = false }: CertificationsBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [saving, setSaving] = useState(false)

  const count = certifications.length
  const summary = count === 0 ? 'No certifications added' : `${count} certification${count !== 1 ? 's' : ''}`

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const persist = async (updated: Certification[], successMsg?: string) => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certifications: updated }),
      })
      if (res.ok) {
        onChange(updated)
        if (successMsg) toast.success(successMsg)
      } else {
        toast.error('Failed to save certifications.')
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
      const oldIndex = certifications.findIndex((c) => c.id === active.id)
      const newIndex = certifications.findIndex((c) => c.id === over.id)
      persist(arrayMove(certifications, oldIndex, newIndex))
    }
  }

  const header = (
    <div className="flex items-center justify-between px-5 pt-4 pb-3">
      <div className="space-y-0.5 flex-1 min-w-0">
        <p className="font-semibold text-sm flex items-center gap-2">
          <Award className="h-4 w-4 opacity-60" />
          Certifications
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isCollapsed ? summary : 'Professional certifications and licenses.'}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 ml-2">
        {!isCollapsed && !isAdding && !editingId && (
          <Button variant="ghost" size="icon" onClick={() => { setIsCollapsed(false); setIsAdding(true) }} className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={saving}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsed && 'rotate-180')} />
        </Button>
      </div>
    </div>
  )

  const body = (
    <div className="px-5 pb-5 space-y-3">
      {isAdding && (
        <CertificationForm
          certification={{ id: generateId(), ...emptyCertification }}
          onSave={(cert) => { persist([...certifications, cert], 'Certification added.'); setIsAdding(false) }}
          onCancel={() => setIsAdding(false)}
        />
      )}
      {certifications.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground italic">No certifications added yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={certifications.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {certifications.map((cert) =>
                editingId === cert.id ? (
                  <CertificationForm
                    key={cert.id}
                    certification={cert}
                    onSave={(updated) => { persist(certifications.map((c) => c.id === updated.id ? updated : c), 'Certification updated.'); setEditingId(null) }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <SortableCertificationItem
                    key={cert.id}
                    certification={cert}
                    onEdit={() => setEditingId(cert.id)}
                    onDelete={() => persist(certifications.filter((c) => c.id !== cert.id), 'Certification removed.')}
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
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
