import { create } from "zustand"
import { toast } from "sonner"
import { leaf, splitAt, removeLeaf, leafIds, setSizes, type SplitNode } from "@/lib/terminal/layout"
import type { TermStatus } from "@/lib/terminal/status"
import { loadTerminalState, saveTerminalState, terminalKill } from "@/lib/desktop/terminal-bridge"

export interface TerminalTab { id: string; name: string; layout: SplitNode; terminalNames: Record<string, string> }
export interface TerminalProject {
  id: string; path: string; name: string; collapsed: boolean; tabs: TerminalTab[]; activeTabId: string | null
}
export interface TerminalPersisted { projects: TerminalProject[]; activeProjectId: string | null }

interface TerminalState extends TerminalPersisted {
  statuses: Record<string, TermStatus>
  /** Live window titles set by the shell/program (OSC 0/2); not persisted. */
  titles: Record<string, string>
  focusedTerminalId: string | null
  dirty: boolean
  loaded: boolean
  load: () => Promise<void>
  addProject: (path: string, firstTabName?: string) => void
  removeProject: (id: string) => void
  toggleCollapsed: (id: string) => void
  selectProject: (id: string) => void
  newTab: (projectId: string, name?: string) => void
  closeTab: (projectId: string, tabId: string) => void
  renameTab: (projectId: string, tabId: string, name: string) => void
  split: (terminalId: string, dir: "row" | "col") => void
  closeTerminal: (terminalId: string) => void
  resize: (tabId: string, path: number[], sizes: number[]) => void
  focusTerminal: (terminalId: string) => void
  setStatus: (id: string, s: TermStatus) => void
  setTitle: (id: string, title: string) => void
}

const uid = () => crypto.randomUUID()
const makeTab = (n: number, name?: string): TerminalTab => ({ id: uid(), name: name || `Terminal ${n}`, layout: leaf(uid()), terminalNames: {} })
const kill = (ids: string[]) => ids.forEach((id) => terminalKill(id).catch(() => {}))
const find = (projects: TerminalProject[], terminalId: string) => {
  for (const p of projects)
    for (const t of p.tabs) if (leafIds(t.layout).includes(terminalId)) return { p, t }
  return null
}

const SAVE_DELAY_MS = 500
let timer: ReturnType<typeof setTimeout> | undefined
let inflight: Promise<void> | null = null
let rerun = false
let failedOnce = false
let loadFailedOnce = false
let loading: Promise<void> | null = null

/** Test hook: clear module-level save/load bookkeeping. */
export function resetTerminalSaveState() {
  clearTimeout(timer)
  inflight = null
  rerun = false
  failedOnce = false
  loadFailedOnce = false
  loading = null
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const useTerminalStore = create<TerminalState>((set, get) => {
  // Saves are serialized: at most one PUT in flight; changes arriving meanwhile
  // trigger exactly one follow-up with the latest state. Only the last result
  // decides dirty/toast. Nothing is sent until load() has succeeded (fail closed).
  const flush = () => {
    if (!get().loaded) return
    if (inflight) {
      rerun = true
      return
    }
    inflight = (async () => {
      let ok = false
      do {
        rerun = false
        const { projects, activeProjectId } = get()
        try {
          await saveTerminalState({ projects, activeProjectId })
          ok = true
        } catch (e) {
          ok = false
          if (!rerun && !failedOnce) toast.error(errMsg(e))
          if (!rerun) failedOnce = true
        }
      } while (rerun)
      if (ok) {
        failedOnce = false
        set({ dirty: false })
      }
      inflight = null
    })()
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(flush, SAVE_DELAY_MS)
  }
  // Apply a structural change, mark dirty, schedule the debounced save.
  const mutate = (fn: (s: TerminalState) => Partial<TerminalState>) => {
    set((s) => ({ ...fn(s), dirty: true }))
    schedule()
  }
  const dropStatuses = (ids: string[]) =>
    set((s) => {
      const statuses = { ...s.statuses }
      ids.forEach((id) => delete statuses[id])
      return { statuses }
    })
  const mapProject = (id: string, fn: (p: TerminalProject) => TerminalProject) => (s: TerminalState) => ({
    projects: s.projects.map((p) => (p.id === id ? fn(p) : p)),
  })

  const doLoad = async () => {
    try {
      const d = await loadTerminalState()
      const loaded = d.projects ?? []
      set((s) => {
        const ids = new Set(loaded.map((p) => p.id))
        // Keep loaded projects, append any created while loading.
        return {
          projects: [...loaded, ...s.projects.filter((p) => !ids.has(p.id))],
          activeProjectId: s.activeProjectId ?? d.activeProjectId ?? null,
          loaded: true,
        }
      })
      loadFailedOnce = false
      if (get().dirty) schedule()
    } catch (e) {
      // Fail closed: stay unloaded so nothing is ever saved over real data.
      if (!loadFailedOnce) toast.error(errMsg(e))
      loadFailedOnce = true
    }
  }

  return {
    projects: [], activeProjectId: null, statuses: {}, titles: {}, focusedTerminalId: null, dirty: false, loaded: false,

    // Idempotent: a no-op once loaded; concurrent callers share one request.
    load: () => {
      if (get().loaded) return Promise.resolve()
      loading ??= doLoad().finally(() => (loading = null))
      return loading
    },

    addProject: (path, firstTabName) => {
      const tab = makeTab(1, firstTabName)
      const project: TerminalProject = {
        id: uid(), path, name: path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path,
        collapsed: false, tabs: [tab], activeTabId: tab.id,
      }
      mutate((s) => ({ projects: [...s.projects, project], activeProjectId: project.id }))
    },

    removeProject: (id) => {
      const p = get().projects.find((x) => x.id === id)
      if (p) {
        const ids = p.tabs.flatMap((t) => leafIds(t.layout))
        kill(ids)
        dropStatuses(ids)
      }
      mutate((s) => ({
        projects: s.projects.filter((x) => x.id !== id),
        activeProjectId: s.activeProjectId === id ? (s.projects.find((x) => x.id !== id)?.id ?? null) : s.activeProjectId,
      }))
    },

    toggleCollapsed: (id) => mutate(mapProject(id, (p) => ({ ...p, collapsed: !p.collapsed }))),

    selectProject: (id) => {
      if (get().activeProjectId !== id) mutate(() => ({ activeProjectId: id }))
    },

    newTab: (projectId, name) =>
      mutate(mapProject(projectId, (p) => {
        const tab = makeTab(p.tabs.length + 1, name)
        return { ...p, tabs: [...p.tabs, tab], activeTabId: tab.id }
      })),

    closeTab: (projectId, tabId) => {
      const t = get().projects.find((p) => p.id === projectId)?.tabs.find((x) => x.id === tabId)
      if (t) {
        kill(leafIds(t.layout))
        dropStatuses(leafIds(t.layout))
      }
      mutate(mapProject(projectId, (p) => {
        const tabs = p.tabs.filter((x) => x.id !== tabId)
        return { ...p, tabs, activeTabId: p.activeTabId === tabId ? (tabs[tabs.length - 1]?.id ?? null) : p.activeTabId }
      }))
    },

    renameTab: (projectId, tabId, name) =>
      mutate(mapProject(projectId, (p) => ({ ...p, tabs: p.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)) }))),

    split: (terminalId, dir) => {
      const hit = find(get().projects, terminalId)
      if (!hit) return
      const newId = uid()
      mutate(mapProject(hit.p.id, (p) => ({
        ...p,
        tabs: p.tabs.map((t) => (t.id === hit.t.id ? { ...t, layout: splitAt(t.layout, terminalId, dir, newId) } : t)),
      })))
      set({ focusedTerminalId: newId })
    },

    closeTerminal: (terminalId) => {
      const hit = find(get().projects, terminalId)
      if (!hit) return
      kill([terminalId])
      dropStatuses([terminalId])
      const layout = removeLeaf(hit.t.layout, terminalId)
      mutate(mapProject(hit.p.id, (p) => {
        if (!layout) {
          const tabs = p.tabs.filter((t) => t.id !== hit.t.id)
          return { ...p, tabs, activeTabId: p.activeTabId === hit.t.id ? (tabs[tabs.length - 1]?.id ?? null) : p.activeTabId }
        }
        const { [terminalId]: _gone, ...names } = hit.t.terminalNames
        return { ...p, tabs: p.tabs.map((t) => (t.id === hit.t.id ? { ...t, layout, terminalNames: names } : t)) }
      }))
    },

    resize: (tabId, path, sizes) =>
      mutate((s) => ({
        projects: s.projects.map((p) => ({
          ...p,
          tabs: p.tabs.map((t) => (t.id === tabId ? { ...t, layout: setSizes(t.layout, path, sizes) } : t)),
        })),
      })),

    focusTerminal: (terminalId) => {
      const hit = find(get().projects, terminalId)
      if (!hit) return
      // Pure focus moves inside the visible tab don't touch persisted state.
      if (get().activeProjectId === hit.p.id && hit.p.activeTabId === hit.t.id && !hit.p.collapsed) {
        set({ focusedTerminalId: terminalId })
        return
      }
      // Expands a collapsed project so a Needs-you jump lands on a visible row.
      mutate(({ projects }) => ({
        projects: projects.map((p) => (p.id === hit.p.id ? { ...p, activeTabId: hit.t.id, collapsed: false } : p)),
        activeProjectId: hit.p.id,
        focusedTerminalId: terminalId,
      }))
    },

    setStatus: (id, s) =>
      set((st) => {
        if (!find(st.projects, id)) return st
        if (s === "idle") {
          const { [id]: _gone, ...rest } = st.statuses
          return { statuses: rest }
        }
        return { statuses: { ...st.statuses, [id]: s } }
      }),

    // ponytail: titles of closed panes are never pruned (a few bytes per uuid per session).
    setTitle: (id, title) => set((st) => (st.titles[id] === title ? st : { titles: { ...st.titles, [id]: title } })),
  }
})
