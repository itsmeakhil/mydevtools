"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconArrowsMaximize, IconBell, IconFolderPlus, IconGitBranch, IconHome, IconLayoutColumns, IconLayoutRows, IconPlus,
  IconKeyboard, IconSettings, IconTerminal2, IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToolSidebarLayout } from "@/components/tools/tool-sidebar"
import { useConfirm } from "@/components/confirm-dialog"
import { useTabStore } from "@/store/tab-store"
import { nextTabNumber, useTerminalStore, type TerminalProject } from "@/store/terminal-store"
import { leafIds } from "@/lib/terminal/layout"
import { needsAttention, needsYou } from "@/lib/terminal/status"
import {
  isForeignEditable, matchShortcut, neighborPane, nextWaiting, singleFlight, tabIndexFor, tildify, type PaneRect,
} from "@/lib/terminal/util"
import { onClosePane, terminalGitInfo, terminalSetViewing, terminalWorktreeRemove, type Worktree } from "@/lib/desktop/terminal-bridge"
import { cn } from "@/lib/utils"
import { usePaletteActions, type PaletteActionGroup } from "@/lib/palette-actions"
import { agentName, LAUNCH_AGENTS } from "@/lib/terminal/agents"
import { LaunchMenu } from "./launch-menu"
import { TerminalSettings } from "./terminal-settings"
import { ShortcutsDialog } from "./shortcuts-dialog"
import { SplitView } from "./split-view"
import { StatusDot, TerminalSidebar, useTabReorder, type GitInfo } from "./terminal-sidebar"
import { anyBusy, CloseGuardContext, useCloseGuard, type CloseGuard } from "./close-guard"

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
/** On-screen boxes of the visible panes (hidden tabs measure 0×0 and are skipped). */
const paneRects = (ids: string[]): PaneRect[] =>
  ids.flatMap((id) => {
    const el = document.querySelector(`[data-terminal-id="${CSS.escape(id)}"]`)
    const r = el?.getBoundingClientRect()
    return r && r.width > 0 ? [{ id, left: r.left, top: r.top, right: r.right, bottom: r.bottom }] : []
  })

/** Home folder, for "Open home folder" and shortening paths to ~. */
function useHomeDir() {
  const [home, setHome] = React.useState<string | null>(null)
  React.useEffect(() => {
    let live = true
    import("@tauri-apps/api/path")
      .then(({ homeDir }) => homeDir())
      .then((h) => live && setHome(h))
      .catch(() => {}) // not in Tauri: paths stay absolute, the home action is hidden
    return () => {
      live = false
    }
  }, [])
  return home
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

function TabBar({ project, isRepo, onWorktreeClosed }: {
  project: TerminalProject; isRepo: boolean; onWorktreeClosed: (wt: Worktree) => void
}) {
  const t = useTranslations("Terminal")
  const statuses = useTerminalStore((s) => s.statuses)
  const focusedId = useTerminalStore((s) => s.focusedTerminalId)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  const dnd = useTabReorder()
  const guardClose = useCloseGuard()
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>())

  const commit = (tabId: string) => {
    const name = draft.trim()
    if (name) S().renameTab(project.id, tabId, name)
    setEditing(null)
  }
  const activeTab = project.tabs.find((tab) => tab.id === project.activeTabId)
  const focusedInProject = !!focusedId && !!activeTab && leafIds(activeTab.layout).includes(focusedId)

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
      <div role="tablist" aria-label={project.name} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {project.tabs.map((tab, i) => {
          const active = tab.id === project.activeTabId
          // Blocked outranks finished when a tab has both.
          const tabStatuses = leafIds(tab.layout).map((id) => statuses[id])
          const attention = tabStatuses.includes("waiting") ? "waiting" : tabStatuses.includes("done") ? "done" : null
          return (
            <div
              key={tab.id}
              {...(editing === tab.id ? {} : dnd.props(project.id, tab.id))}
              className={cn(
                "group/tab flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-2.5 pr-1 text-[13px] transition-colors",
                active ? "bg-primary/[0.12] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                dnd.over === tab.id && "ring-2 ring-inset ring-primary/50",
                dnd.draggingId === tab.id && "opacity-50",
              )}
            >
              {attention && <StatusDot status={attention} />}
              {tab.worktree && (
                <IconGitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={tab.worktree.branch} />
              )}
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
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el)
                    else tabRefs.current.delete(tab.id)
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => S().focusTerminal(leafIds(tab.layout)[0])}
                  onDoubleClick={() => {
                    setDraft(tab.name)
                    setEditing(tab.id)
                  }}
                  onKeyDown={(e) => {
                    // Roving tabindex: ←/→ (Home/End) select the neighbouring tab; F2 renames.
                    const n = project.tabs.length
                    const to =
                      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n
                        : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null
                    if (e.key === "F2") {
                      e.preventDefault()
                      setDraft(tab.name)
                      setEditing(tab.id)
                    }
                    if (to === null) return
                    e.preventDefault()
                    const next = project.tabs[to]
                    S().focusTerminal(leafIds(next.layout)[0])
                    tabRefs.current.get(next.id)?.focus()
                  }}
                  title={tab.name}
                  className="max-w-40 truncate rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {tab.name}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  guardClose(leafIds(tab.layout), () => {
                    S().closeTab(project.id, tab.id)
                    if (tab.worktree) onWorktreeClosed(tab.worktree)
                  })
                }
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
          onClick={() => S().newTab(project.id, t("untitledTab", { n: nextTabNumber(project) }))}
          aria-label={t("newTab")}
          title={`${t("newTab")} (⌘T)`}
        >
          <IconPlus className="h-4 w-4" />
        </Button>
        <LaunchMenu project={project} isRepo={isRepo} />
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

function Empty({ message, action, onAction, secondary, icon: Icon }: {
  message: string; action: string; onAction: () => void; icon: React.ElementType
  secondary?: { label: string; icon: React.ElementType; onClick: () => void }
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      <p className="text-[13px] text-muted-foreground">{message}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onAction}>{action}</Button>
        {secondary && (
          <Button size="sm" variant="ghost" onClick={secondary.onClick}>
            <secondary.icon className="h-4 w-4" aria-hidden />
            {secondary.label}
          </Button>
        )}
      </div>
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
  const home = useHomeDir()
  const cwds = useTerminalStore((s) => s.cwds)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)

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
  const viewingWaiting = viewing ? needsAttention(statuses[viewing]) : false
  React.useEffect(() => {
    terminalSetViewing(viewing).catch(() => {}) // best effort: only affects notifications
  }, [viewing, viewingWaiting])
  React.useEffect(() => () => void terminalSetViewing(null).catch(() => {}), [])

  // Closing always asks; a running command or waiting agent gets the stronger warning.
  const guardClose = React.useCallback<CloseGuard>(
    async (ids, close) => {
      const busy = anyBusy(ids)
      const ok = await confirm({
        title: t(busy ? "closeRunningTitle" : "closeTitle"),
        description: busy ? t("closeRunningBody") : undefined,
        confirmLabel: t("close"),
        cancelLabel: t("cancel"),
        destructive: true,
      })
      if (ok) close()
    },
    [confirm, t],
  )
  const guardRef = React.useRef(guardClose)
  React.useEffect(() => {
    guardRef.current = guardClose
  }, [guardClose])

  // ⌘W comes from the macOS menu (it pre-empts the webview), not a keydown.
  React.useEffect(() => {
    let unlisten: (() => void) | undefined
    let gone = false
    onClosePane(({ id }) => {
      if (shortcutsBlocked(document.activeElement as HTMLElement | null)) return
      if (visibleLeaves().includes(id)) guardRef.current([id], () => S().closeTerminal(id))
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
      if (typeof action === "object") {
        if ("tab" in action) {
          const i = p ? tabIndexFor(action.tab, p.tabs.length) : null
          if (p && i !== null) st.focusTerminal(leafIds(p.tabs[i].layout)[0])
        } else if (focused) {
          const ids = visibleLeaves()
          const id = ids.includes(focused) ? neighborPane(paneRects(ids), focused, action.focus) : null
          if (id) st.focusTerminal(id)
        }
        return
      }
      switch (action) {
        case "shortcuts":
          setShortcutsOpen(true)
          break
        case "zoomPane":
          if (focused && visibleLeaves().includes(focused)) st.toggleZoom(focused)
          break
        case "splitRow":
        case "splitCol":
          // Only a pane on screen: focus can linger on a hidden project's pane (e.g. zero-tab project).
          if (!focused || !visibleLeaves().includes(focused)) return
          st.split(focused, action === "splitRow" ? "row" : "col")
          break
        case "newTab":
          if (!p) return
          st.newTab(p.id, t("untitledTab", { n: nextTabNumber(p) }))
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
  const openHome = React.useMemo(
    () => (home ? { label: t("openHome"), icon: IconHome, onClick: () => S().addProject(home, t("untitledTab", { n: 1 })) } : undefined),
    [home, t],
  )

  // ⌘K actions while the Terminal is the open tool.
  const paletteGroup = React.useMemo((): PaletteActionGroup | null => {
    if (!toolActive) return null
    const project = () => {
      const st = S()
      return st.projects.find((x) => x.id === st.activeProjectId) ?? st.projects[0]
    }
    const visibleFocus = () => {
      const f = S().focusedTerminalId
      return f && visibleLeaves().includes(f) ? f : null
    }
    const withProject = (fn: (p: TerminalProject) => void) => () => {
      const p = project()
      if (p) fn(p)
    }
    return {
      heading: t("title"),
      actions: [
        { id: "terminal-new-tab", title: t("newTab"), hint: "⌘T", Icon: IconPlus,
          run: withProject((p) => S().newTab(p.id, t("untitledTab", { n: nextTabNumber(p) }))) },
        ...LAUNCH_AGENTS.map((a) => ({
          id: `terminal-start-${a}`, title: t("startAgent", { agent: agentName(a) }), Icon: IconTerminal2,
          run: withProject((p) => S().newTab(p.id, agentName(a), { run: a })),
        })),
        { id: "terminal-split-right", title: t("splitRight"), hint: "⌘D", Icon: IconLayoutColumns,
          run: () => { const f = visibleFocus(); if (f) S().split(f, "row") } },
        { id: "terminal-split-down", title: t("splitDown"), hint: "⌘⇧D", Icon: IconLayoutRows,
          run: () => { const f = visibleFocus(); if (f) S().split(f, "col") } },
        { id: "terminal-maximize", title: t("maximizePane"), hint: "⌘⇧↵", Icon: IconArrowsMaximize,
          run: () => { const f = visibleFocus(); if (f) S().toggleZoom(f) } },
        { id: "terminal-next-waiting", title: t("nextWaitingHint"), hint: "⌘J", Icon: IconBell,
          run: () => {
            const st = S()
            const id = nextWaiting(needsYou(st.projects, st.statuses).map((i) => i.terminalId), st.focusedTerminalId)
            if (id) st.focusTerminal(id)
          } },
        { id: "terminal-add-project", title: t("addProject"), Icon: IconFolderPlus, run: () => void addProject() },
        { id: "terminal-settings", title: t("settings"), Icon: IconSettings, run: () => setSettingsOpen(true) },
        { id: "terminal-shortcuts", title: t("shortcutsTitle"), hint: "⌘/", Icon: IconKeyboard, run: () => setShortcutsOpen(true) },
      ],
    }
  }, [toolActive, t, addProject])
  usePaletteActions(paletteGroup)

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
  // Closing a worktree tab: offer to delete its checkout (the branch always stays).
  const offerRemoveWorktree = React.useCallback(
    async (wt: Worktree) => {
      const ok = await confirm({
        title: t("removeWorktreeTitle", { branch: wt.branch }),
        description: t("removeWorktreeBody"),
        confirmLabel: t("removeWorktree"),
        cancelLabel: t("keepWorktree"),
        destructive: true,
      })
      if (ok) terminalWorktreeRemove(wt.path).catch((e) => toast.error(errMsg(e)))
    },
    [confirm, t],
  )
  // Status bar follows the focused pane's directory (OSC 7); the project folder until the shell reports one.
  const shownPath = (focusedId && activeLeaves.includes(focusedId) && cwds[focusedId]) || project?.path || ""

  return (
    <CloseGuardContext.Provider value={guardClose}>
    <ToolSidebarLayout
      toolId="terminal"
      icon={IconTerminal2}
      title={t("title")}
      primaryAction={{ icon: IconFolderPlus, label: t("addProject"), onClick: addProject }}
      sidebar={<TerminalSidebar git={git} onAddProject={addProject} onRemoveProject={removeProject} />}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        {!project ? (
          <Empty icon={IconTerminal2} message={t("noProjects")} action={t("addProject")} onAction={addProject} secondary={openHome} />
        ) : (
          <>
            {project.tabs.length > 0 && <TabBar project={project} isRepo={!!info?.branch} onWorktreeClosed={offerRemoveWorktree} />}
            <div className="relative min-h-0 flex-1">
              {project.tabs.length === 0 && (
                <div className="absolute inset-0 flex">
                  <Empty
                    icon={IconTerminal2}
                    message={t("noTabs")}
                    action={t("newTab")}
                    onAction={() => S().newTab(project.id, t("untitledTab", { n: nextTabNumber(project) }))}
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
                          ctx={{ tab, cwd: tab.worktree?.path ?? p.path, projectName: p.name, visible: shown && toolActive }}
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
              <span className="min-w-0 truncate" title={shownPath}>{tildify(shownPath, home)}</span>
              <span className="ml-auto flex shrink-0 items-center gap-3">
                {info?.changed != null && info.changed > 0 && (
                  <span className="tabular-nums">{t("changedFiles", { count: info.changed })}</span>
                )}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  aria-label={t("settings")}
                  title={t("settings")}
                  className="rounded p-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <IconSettings className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            </div>
          </>
        )}
      </div>
      {dialog}
      {settingsOpen && <TerminalSettings open onOpenChange={setSettingsOpen} />}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </ToolSidebarLayout>
    </CloseGuardContext.Provider>
  )
}
