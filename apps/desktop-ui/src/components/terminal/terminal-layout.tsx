"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconFolderPlus, IconGitBranch, IconLayoutColumns, IconLayoutRows, IconPlus, IconTerminal2, IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToolSidebarLayout } from "@/components/tools/tool-sidebar"
import { useConfirm } from "@/components/confirm-dialog"
import { useTabStore } from "@/store/tab-store"
import { useTerminalStore, type TerminalProject } from "@/store/terminal-store"
import { leafIds } from "@/lib/terminal/layout"
import { needsYou } from "@/lib/terminal/status"
import { isForeignEditable, matchShortcut, nextWaiting, singleFlight } from "@/lib/terminal/util"
import { onClosePane, terminalGitInfo, terminalSetViewing } from "@/lib/desktop/terminal-bridge"
import { cn } from "@/lib/utils"
import { SplitView } from "./split-view"
import { StatusDot, TerminalSidebar, type GitInfo } from "./terminal-sidebar"

const TOOL_PATH = "/app/terminal"
const GIT_POLL_MS = 5000
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const S = () => useTerminalStore.getState()
/** Panes of the tab on screen (active project's active tab), read fresh from the store. */
const visibleLeaves = () => {
  const st = S()
  const p = st.projects.find((x) => x.id === st.activeProjectId) ?? st.projects[0]
  const tab = p?.tabs.find((x) => x.id === p.activeTabId)
  return tab ? leafIds(tab.layout) : []
}

function useWindowFocused() {
  const [focused, setFocused] = React.useState(() => typeof document === "undefined" || document.hasFocus())
  React.useEffect(() => {
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    window.addEventListener("focus", on)
    window.addEventListener("blur", off)
    return () => {
      window.removeEventListener("focus", on)
      window.removeEventListener("blur", off)
    }
  }, [])
  return focused
}

/** Branch for every project + changed count for the active one; on show/focus and every 5 s while visible. */
function useGitInfo(visible: boolean, activeProjectId: string | null) {
  const [git, setGit] = React.useState<Record<string, GitInfo>>({})
  const run = React.useMemo(() => singleFlight<string>(), [])
  const projectsKey = useTerminalStore((s) => s.projects.map((p) => `${p.id}=${p.path}`).join("\n"))
  React.useEffect(() => {
    if (!visible) return
    const tick = () => {
      for (const p of S().projects) {
        run(p.id, () => terminalGitInfo(p.path, p.id === activeProjectId))
          .then((info) => {
            if (!info) return // previous call for this project still in flight
            setGit((g) => (g[p.id]?.branch === info.branch && g[p.id]?.changed === info.changed ? g : { ...g, [p.id]: info }))
          })
          .catch(() => {}) // Rust returns empty info on failure; an IPC error just skips this tick
      }
    }
    tick()
    const h = setInterval(tick, GIT_POLL_MS)
    return () => clearInterval(h)
  }, [visible, activeProjectId, projectsKey, run])
  return git
}

function TabBar({ project }: { project: TerminalProject }) {
  const t = useTranslations("Terminal")
  const statuses = useTerminalStore((s) => s.statuses)
  const focusedId = useTerminalStore((s) => s.focusedTerminalId)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")

  const commit = (tabId: string) => {
    const name = draft.trim()
    if (name) S().renameTab(project.id, tabId, name)
    setEditing(null)
  }
  const activeTab = project.tabs.find((tab) => tab.id === project.activeTabId)
  const focusedInProject = !!focusedId && !!activeTab && leafIds(activeTab.layout).includes(focusedId)

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {project.tabs.map((tab) => {
          const active = tab.id === project.activeTabId
          const waiting = leafIds(tab.layout).some((id) => statuses[id] === "waiting")
          return (
            <div
              key={tab.id}
              className={cn(
                "group/tab flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-2.5 pr-1 text-[13px] transition-colors",
                active ? "bg-primary/[0.12] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              {waiting && <StatusDot status="waiting" />}
              {editing === tab.id ? (
                <Input
                  autoFocus
                  value={draft}
                  aria-label={t("renameTab")}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(tab.id)
                    if (e.key === "Escape") setEditing(null)
                  }}
                  className="h-5 w-32 px-1 text-[13px]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => S().focusTerminal(leafIds(tab.layout)[0])}
                  onDoubleClick={() => {
                    setDraft(tab.name)
                    setEditing(tab.id)
                  }}
                  title={t("renameTab")}
                  className="max-w-40 truncate"
                >
                  {tab.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => S().closeTab(project.id, tab.id)}
                aria-label={t("closeTab")}
                title={t("closeTab")}
                className={cn(
                  "rounded p-0.5 text-muted-foreground transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100",
                  active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
                )}
              >
                <IconX className="h-3 w-3" aria-hidden />
              </button>
            </div>
          )
        })}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => S().newTab(project.id, t("untitledTab", { n: project.tabs.length + 1 }))}
          aria-label={t("newTab")}
          title={`${t("newTab")} (⌘T)`}
        >
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={!focusedInProject}
        onClick={() => focusedId && S().split(focusedId, "row")}
        aria-label={t("splitRight")}
        title={`${t("splitRight")} (⌘D)`}
      >
        <IconLayoutColumns className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={!focusedInProject}
        onClick={() => focusedId && S().split(focusedId, "col")}
        aria-label={t("splitDown")}
        title={`${t("splitDown")} (⌘⇧D)`}
      >
        <IconLayoutRows className="h-4 w-4" />
      </Button>
    </div>
  )
}

/** Leave typing in other fields (tab rename, dialogs, ⌘K palette) and open dialogs alone. */
const shortcutsBlocked = (el: HTMLElement | null) =>
  isForeignEditable(el) || !!document.querySelector('[role="dialog"], [role="alertdialog"]')

function Empty({ message, action, onAction, icon: Icon }: { message: string; action: string; onAction: () => void; icon: React.ElementType }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      <p className="text-[13px] text-muted-foreground">{message}</p>
      <Button size="sm" onClick={onAction}>{action}</Button>
    </div>
  )
}

export function TerminalLayout() {
  const t = useTranslations("Terminal")
  const { confirm, dialog } = useConfirm()
  const projects = useTerminalStore((s) => s.projects)
  const statuses = useTerminalStore((s) => s.statuses)
  const focusedId = useTerminalStore((s) => s.focusedTerminalId)
  const activeProjectId = useTerminalStore((s) => s.activeProjectId)
  const toolActive = useTabStore((s) => s.activeTabPath === TOOL_PATH)
  const windowFocused = useWindowFocused()

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0]
  const activeTab = project?.tabs.find((tab) => tab.id === project.activeTabId) ?? null
  const activeLeaves = React.useMemo(() => (activeTab ? leafIds(activeTab.layout) : []), [activeTab])
  const git = useGitInfo(toolActive && windowFocused, project?.id ?? null)

  // Load once on mount (idempotent; a later app-wide listener may have done it already).
  React.useEffect(() => void S().load(), [])

  // Keep visited tabs mounted (hidden) so switching back doesn't reattach; unvisited tabs never spawn.
  const [mounted, setMounted] = React.useState<Set<string>>(() => new Set())
  // (State adjusted during render — React's documented alternative to a sync effect.)
  if (activeTab && !mounted.has(activeTab.id)) setMounted(new Set(mounted).add(activeTab.id))

  // Focus always lives in the visible tab: pick its first pane when it's elsewhere (or closed).
  React.useEffect(() => {
    // Plain focus move: no structural change, so a collapsed project stays collapsed.
    if (activeLeaves.length && (!focusedId || !activeLeaves.includes(focusedId)))
      useTerminalStore.setState({ focusedTerminalId: activeLeaves[0] })
  }, [activeLeaves, focusedId])

  // Tell Rust which pane the user is looking at (suppresses its notification and clears waiting).
  // Re-sent when that pane turns waiting, because the user is already looking at it.
  const viewing = toolActive && windowFocused && focusedId && activeLeaves.includes(focusedId) ? focusedId : null
  const viewingWaiting = viewing ? statuses[viewing] === "waiting" : false
  React.useEffect(() => {
    terminalSetViewing(viewing).catch(() => {}) // best effort: only affects notifications
  }, [viewing, viewingWaiting])
  React.useEffect(() => () => void terminalSetViewing(null).catch(() => {}), [])

  // ⌘W comes from the macOS menu (it pre-empts the webview), not a keydown.
  React.useEffect(() => {
    let unlisten: (() => void) | undefined
    let gone = false
    onClosePane(({ id }) => {
      if (shortcutsBlocked(document.activeElement as HTMLElement | null)) return
      if (visibleLeaves().includes(id)) S().closeTerminal(id)
    })
      .then((u) => (gone ? u() : (unlisten = u)))
      .catch(() => {})
    return () => {
      gone = true
      unlisten?.()
    }
  }, [])

  // Capture phase so the shortcut never reaches xterm's textarea.
  React.useEffect(() => {
    if (!toolActive) return
    const onKey = (e: KeyboardEvent) => {
      const action = matchShortcut(e)
      if (!action) return
      if (shortcutsBlocked(e.target as HTMLElement | null)) return
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return // holding ⌘D must not split repeatedly
      const st = S()
      const p = st.projects.find((x) => x.id === st.activeProjectId) ?? st.projects[0]
      const focused = st.focusedTerminalId
      const tabIdx = p ? p.tabs.findIndex((x) => x.id === p.activeTabId) : -1
      switch (action) {
        case "splitRow":
        case "splitCol":
          // Only a pane on screen: focus can linger on a hidden project's pane (e.g. zero-tab project).
          if (!focused || !visibleLeaves().includes(focused)) return
          st.split(focused, action === "splitRow" ? "row" : "col")
          break
        case "newTab":
          if (!p) return
          st.newTab(p.id, t("untitledTab", { n: p.tabs.length + 1 }))
          break
        case "nextTab":
        case "prevTab": {
          if (!p || p.tabs.length < 2) return
          const n = p.tabs.length
          const next = p.tabs[(tabIdx + (action === "nextTab" ? 1 : n - 1) + n) % n]
          st.focusTerminal(leafIds(next.layout)[0])
          break
        }
        case "nextWaiting": {
          const id = nextWaiting(needsYou(st.projects, st.statuses).map((i) => i.terminalId), focused)
          if (!id) return
          st.focusTerminal(id)
          break
        }
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [toolActive, t])

  const addProject = React.useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const dir = await open({ directory: true })
      if (typeof dir === "string") S().addProject(dir, t("untitledTab", { n: 1 }))
    } catch (e) {
      toast.error(errMsg(e))
    }
  }, [t])

  const removeProject = React.useCallback(
    async (p: TerminalProject) => {
      const ok = await confirm({
        title: t("removeProject"),
        description: t("removeProjectBody", { name: p.name }),
        confirmLabel: t("removeProject"),
        cancelLabel: t("cancel"),
        destructive: true,
      })
      if (ok) S().removeProject(p.id)
    },
    [confirm, t],
  )

  const info = project ? git[project.id] : undefined

  return (
    <ToolSidebarLayout
      toolId="terminal"
      icon={IconTerminal2}
      title={t("title")}
      primaryAction={{ icon: IconFolderPlus, label: t("addProject"), onClick: addProject }}
      sidebar={<TerminalSidebar git={git} onAddProject={addProject} onRemoveProject={removeProject} />}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        {!project ? (
          <Empty icon={IconTerminal2} message={t("noProjects")} action={t("addProject")} onAction={addProject} />
        ) : (
          <>
            {project.tabs.length > 0 && <TabBar project={project} />}
            <div className="relative min-h-0 flex-1">
              {project.tabs.length === 0 && (
                <div className="absolute inset-0 flex">
                  <Empty
                    icon={IconTerminal2}
                    message={t("noTabs")}
                    action={t("newTab")}
                    onAction={() => S().newTab(project.id, t("untitledTab", { n: 1 }))}
                  />
                </div>
              )}
              {projects.flatMap((p) =>
                p.tabs
                  .filter((tab) => mounted.has(tab.id) || tab.id === activeTab?.id)
                  .map((tab) => {
                    const shown = tab.id === activeTab?.id
                    return (
                      <div key={tab.id} className={cn("absolute inset-0", !shown && "hidden")}>
                        <SplitView
                          node={tab.layout}
                          path={[]}
                          ctx={{ tab, cwd: p.path, projectName: p.name, visible: shown && toolActive }}
                        />
                      </div>
                    )
                  }),
              )}
            </div>
            <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border px-3 text-[12px] text-muted-foreground">
              {info?.branch && (
                <span className="flex min-w-0 shrink-0 items-center gap-1">
                  <IconGitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-mono">{info.branch}</span>
                </span>
              )}
              <span className="min-w-0 truncate" title={project.path}>{project.path}</span>
              {info?.changed != null && info.changed > 0 && (
                <span className="ml-auto shrink-0 tabular-nums">{t("changedFiles", { count: info.changed })}</span>
              )}
            </div>
          </>
        )}
      </div>
      {dialog}
    </ToolSidebarLayout>
  )
}
