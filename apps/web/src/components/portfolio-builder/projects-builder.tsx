'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  FolderKanban,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Github,
  Globe,
  ImageIcon,
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
import { TechStackPicker, TECH_CATALOG } from '@/components/tech-stack-picker'

export interface Project {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  githubUrl?: string | null
  liveUrl?: string | null
  technologies: string[]
}

interface ProjectsBuilderProps {
  projects: Project[]
  onChange: (projects: Project[]) => void
}

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const emptyProject: Omit<Project, 'id'> = {
  title: '',
  description: '',
  imageUrl: null,
  githubUrl: null,
  liveUrl: null,
  technologies: [],
}

function ProjectForm({
  project,
  onSave,
  onCancel,
}: {
  project: Project
  onSave: (proj: Project) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Project>({ ...project })
  const isValid = form.title.trim() && form.description.trim()

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Project Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. DevTools Platform" className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Description *</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this project do?" className="min-h-[80px] resize-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Github className="h-3 w-3" /> GitHub URL
          </Label>
          <Input value={form.githubUrl || ''} onChange={(e) => setForm({ ...form, githubUrl: e.target.value || null })} placeholder="https://github.com/..." className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3 w-3" /> Live URL
          </Label>
          <Input value={form.liveUrl || ''} onChange={(e) => setForm({ ...form, liveUrl: e.target.value || null })} placeholder="https://myproject.com" className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3" /> Cover Image URL
        </Label>
        <Input value={form.imageUrl || ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value || null })} placeholder="https://..." className="h-9" />
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

function SortableProjectItem({
  project,
  onEdit,
  onDelete,
}: {
  project: Project
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative rounded-lg border bg-background/50 p-4 transition-colors hover:bg-accent/20 ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-start justify-between gap-3 ml-4">
        <div className="flex gap-3 min-w-0 flex-1">
          {project.imageUrl ? (
            <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 border bg-muted">
              <img src={project.imageUrl} alt={project.title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate">{project.title}</h4>
              <div className="flex items-center gap-1 shrink-0">
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                    <Github className="h-3.5 w-3.5" />
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground/80 line-clamp-2">{project.description}</p>
            {project.technologies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.technologies.map((tech) => {
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7"><Edit2 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsBuilder({ projects, onChange }: ProjectsBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const persist = async (updated: Project[], successMsg?: string) => {
    setSaving(true)
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: updated }),
      })
      if (res.ok) {
        onChange(updated)
        if (successMsg) toast.success(successMsg)
      } else {
        toast.error('Failed to save project.')
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
      const oldIndex = projects.findIndex((p) => p.id === active.id)
      const newIndex = projects.findIndex((p) => p.id === over.id)
      persist(arrayMove(projects, oldIndex, newIndex))
    }
  }

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 opacity-70" />
            Projects
          </CardTitle>
          <CardDescription>Showcase your best work and side projects.</CardDescription>
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
          <ProjectForm
            project={{ id: generateId(), ...emptyProject }}
            onSave={(proj) => { persist([...projects, proj], 'Project added.'); setIsAdding(false) }}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {projects.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground italic">No projects added yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {projects.map((proj) =>
                  editingId === proj.id ? (
                    <ProjectForm
                      key={proj.id}
                      project={proj}
                      onSave={(updated) => { persist(projects.map((p) => p.id === updated.id ? updated : p), 'Project updated.'); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <SortableProjectItem
                      key={proj.id}
                      project={proj}
                      onEdit={() => setEditingId(proj.id)}
                      onDelete={() => persist(projects.filter((p) => p.id !== proj.id), 'Project removed.')}
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
