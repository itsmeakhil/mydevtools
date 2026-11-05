"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import { IconChevronRight, IconFolder, IconFolderPlus, IconTrash } from "@tabler/icons-react"
import { useToolSidebarRail } from "@/components/tools/tool-sidebar"
import { Input } from "@/components/ui/input"
import { useTerminalStore, type TerminalProject, type TerminalTab } from "@/store/terminal-store"
import { leafIds } from "@/lib/terminal/layout"
import { needsYou, projectWaitingCount, type TermStatus } from "@/lib/terminal/status"
import { cn } from "@/lib/utils"

export function StatusDot({ status }: { status: TermStatus | undefined }) {
  const t = useTranslations("Terminal")
  const label = status === "waiting" ? t("statusWaiting") : status === "running" ? t("statusRunning") : t("statusIdle")
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "waiting" ? "bg-destructive" : status === "running" ? "bg-success" : "border border-muted-foreground/60",
      )}
    />
  )
}

/** Display name for a pane: explicit name, else the program's window title, else the tab name (numbered when split). */
export function terminalLabel(tab: TerminalTab, id: string, titles: Record<string, string>) {
  const ids = leafIds(tab.layout)
  return tab.terminalNames[id] ?? titles[id] ?? (ids.length > 1 ? `${tab.name} · ${ids.indexOf(id) + 1}` : tab.name)
}

export interface GitInfo { branch: string | null; changed: number | null }

// Tab being dragged (tab bar chip or sidebar row); module-level so both surfaces share it.
let dragging: { projectId: string; tabId: string } | null = null
const DRAG_MIME = "application/x-mydt-terminal-tab"

/** Native drag-and-drop to reorder a project's tabs. `over` = tab id currently hovered as a drop target. */
export function useTabReorder() {
  const [over, setOver] = React.useState<string | null>(null)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const end = () => {
    dragging = null
    setOver(null)
    setDraggingId(null)
  }
  const props = (projectId: string, tabId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      dragging = { projectId, tabId }
      setDraggingId(tabId)
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData(DRAG_MIME, tabId) // custom type: never drops as text into a terminal
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragging?.projectId !== projectId || dragging.tabId === tabId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setOver(tabId)
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      if (dragging?.projectId === projectId) useTerminalStore.getState().moveTab(projectId, dragging.tabId, tabId)
      end()
    },
    onDragEnd: end,
  })
  return { over, draggingId, props }
}

function NeedsYouBox() {
  const t = useTranslations("Terminal")
  const projects = useTerminalStore((s) => s.projects)
  const statuses = useTerminalStore((s) => s.statuses)
  const titles = useTerminalStore((s) => s.titles)
  const focusTerminal = useTerminalStore((s) => s.focusTerminal)
  const items = React.useMemo(() => needsYou(projects, statuses), [projects, statuses])
  if (items.length === 0) return null
  // Same precedence as the sidebar rows: custom name, then the live shell title, then the tab name.
  const labelOf = (projectId: string, id: string, fallback: string) => {
    const tab = projects.find((p) => p.id === projectId)?.tabs.find((tb) => leafIds(tb.layout).includes(id))
    return tab ? terminalLabel(tab, id, titles) : fallback
  }
  return (
    <div className="mx-2 mt-2 rounded-xl border border-destructive/30 bg-destructive/[0.06] p-1.5">
      <p className="px-1.5 pb-1 pt-0.5 text-[11px] font-semibold text-destructive">{t("needsYou", { count: items.length })}</p>
      {items.map((it) => (
        <button
          key={it.terminalId}
          type="button"
          onClick={() => focusTerminal(it.terminalId)}
          className="flex h-7 w-full items-center gap-2 rounded-lg px-1.5 text-left text-[13px] text-foreground/90 transition-colors hover:bg-foreground/[0.05]"
        >
          <StatusDot status="waiting" />
          <span className="min-w-0 truncate">
            {it.projectName} / {labelOf(it.projectId, it.terminalId, it.terminalName)}
          </span>
        </button>
      ))}
    </div>
  )
}

const TerminalRow = React.memo(function TerminalRow({
  id, projectId, tabId, label, status, active, onSelect,
}: {
  id: string; projectId: string; tabId: string; label: string; status: TermStatus | undefined; active: boolean
  onSelect: (id: string) => void
}) {
  const t = useTranslations("Terminal")
  const [draft, setDraft] = React.useState<string | null>(null)
  const dnd = useTabReorder()
  const commit = () => {
    if (draft !== null) useTerminalStore.getState().renameTerminal(id, draft)
    setDraft(null)
  }

  if (draft !== null)
    return (
      <div className="flex h-7 items-center gap-2 pl-7 pr-1">
        <StatusDot status={status} />
        <Input
          autoFocus
          value={draft}
          aria-label={t("renameTerminal")}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setDraft(null)
          }}
          className="h-6 min-w-0 flex-1 px-1.5 text-[13px]"
        />
      </div>
    )

  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      title={label}
      onClick={() => onSelect(id)}
      onDoubleClick={() => setDraft(label)}
      {...dnd.props(projectId, tabId)}
      className={cn(
        "flex h-7 w-full items-center gap-2 rounded-lg pl-7 pr-2.5 text-left text-[13px] transition-colors",
        active ? "bg-primary/[0.12] font-medium text-foreground" : "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground",
        dnd.over && "ring-2 ring-inset ring-primary/50",
        dnd.draggingId && "opacity-50",
      )}
    >
      <StatusDot status={status} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
})

const ProjectRow = React.memo(function ProjectRow({
  project, active, branch, waiting, statuses, titles, focusedId, onRemove,
}: {
  project: TerminalProject
  active: boolean
  branch: string | null | undefined
  waiting: number
  statuses: Record<string, TermStatus>
  titles: Record<string, string>
  focusedId: string | null
  onRemove: (p: TerminalProject) => void
}) {
  const t = useTranslations("Terminal")
  const toggleCollapsed = useTerminalStore((s) => s.toggleCollapsed)
  const selectProject = useTerminalStore((s) => s.selectProject)
  const focusTerminal = useTerminalStore((s) => s.focusTerminal)
  const open = !project.collapsed
  const rows = project.tabs.flatMap((tab) =>
    leafIds(tab.layout).map((id) => ({ id, tabId: tab.id, label: terminalLabel(tab, id, titles) })),
  )

  return (
    <div>
      <div className="group/row flex items-center gap-0.5 px-2">
        <button
          type="button"
          onClick={() => toggleCollapsed(project.id)}
          aria-expanded={open}
          aria-label={project.name}
          className="flex h-8 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <IconChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => selectProject(project.id)}
          aria-current={active ? "true" : undefined}
          title={project.path}
          className={cn(
            "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left text-[13px] transition-colors",
            active ? "font-medium text-foreground" : "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground",
          )}
        >
          <span className="min-w-0 truncate">{project.name}</span>
          {!open && waiting > 0 ? (
            <span className="ml-auto shrink-0 rounded-full bg-destructive/[0.12] px-1.5 text-[11px] font-medium tabular-nums text-destructive">
              {waiting}
            </span>
          ) : branch ? (
            <span className="ml-auto min-w-0 max-w-[50%] shrink truncate font-mono text-[11px] text-muted-foreground">{branch}</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onRemove(project)}
          aria-label={t("removeProject")}
          title={t("removeProject")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
        >
          <IconTrash className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && rows.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0.5 overflow-hidden px-2"
          >
            {rows.map((r) => (
              <TerminalRow key={r.id} id={r.id} projectId={project.id} tabId={r.tabId} label={r.label} status={statuses[r.id]} active={r.id === focusedId} onSelect={focusTerminal} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export function TerminalSidebar({
  git, onAddProject, onRemoveProject,
}: { git: Record<string, GitInfo>; onAddProject: () => void; onRemoveProject: (p: TerminalProject) => void }) {
  const t = useTranslations("Terminal")
  const projects = useTerminalStore((s) => s.projects)
  const statuses = useTerminalStore((s) => s.statuses)
  const titles = useTerminalStore((s) => s.titles)
  const focusedId = useTerminalStore((s) => s.focusedTerminalId)
  const activeId = useTerminalStore((s) => s.activeProjectId) ?? projects[0]?.id

  // Collapsed-sidebar rail: one entry per project with its waiting count.
  useToolSidebarRail(
    "projects",
    projects.map((p) => ({
      id: p.id,
      label: p.name,
      icon: IconFolder,
      count: projectWaitingCount(p, statuses) || undefined,
      active: p.id === activeId,
      onSelect: () => useTerminalStore.getState().selectProject(p.id),
    })),
  )

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <NeedsYouBox />
        {projects.length > 0 && (
          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold text-muted-foreground/70">{t("projects")}</p>
        )}
        {projects.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            active={p.id === activeId}
            branch={git[p.id]?.branch}
            waiting={projectWaitingCount(p, statuses)}
            statuses={statuses}
            titles={titles}
            focusedId={focusedId}
            onRemove={onRemoveProject}
          />
        ))}
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={onAddProject}
          className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
        >
          <IconFolderPlus className="size-4 shrink-0" aria-hidden />
          {t("addProject")}
        </button>
      </div>
    </>
  )
}
