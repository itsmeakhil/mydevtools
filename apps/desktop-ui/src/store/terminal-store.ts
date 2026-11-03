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
  focusedTerminalId: string | null
  dirty: boolean
  load: () => Promise<void>
  addProject: (path: string) => void
  removeProject: (id: string) => void
  toggleCollapsed: (id: string) => void
  newTab: (projectId: string) => void
  closeTab: (projectId: string, tabId: string) => void
  renameTab: (projectId: string, tabId: string, name: string) => void
  split: (terminalId: string, dir: "row" | "col") => void
  closeTerminal: (terminalId: string) => void
  resize: (tabId: string, path: number[], sizes: number[]) => void
  focusTerminal: (terminalId: string) => void
  setStatus: (id: string, s: TermStatus) => void
}

const uid = () => crypto.randomUUID()
const makeTab = (n: number): TerminalTab => ({ id: uid(), name: `Terminal ${n}`, layout: leaf(uid()), terminalNames: {} })
const kill = (ids: string[]) => ids.forEach((id) => terminalKill(id).catch(() => {}))
const find = (projects: TerminalProject[], terminalId: string) => {
  for (const p of projects)
    for (const t of p.tabs) if (leafIds(t.layout).includes(terminalId)) return { p, t }
  return null
}

const SAVE_DELAY_MS = 500
let timer: ReturnType<typeof setTimeout> | undefined
let failedOnce = false

export const useTerminalStore = create<TerminalState>((set, get) => {
  // Apply a structural change, mark dirty, schedule the debounced save.
  const mutate = (fn: (s: TerminalState) => Partial<TerminalState>) => {
    set((s) => ({ ...fn(s), dirty: true }))
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const { projects, activeProjectId } = get()
      try {
        await saveTerminalState({ projects, activeProjectId })
        failedOnce = false
        // Only clear if nothing changed while the PUT was in flight.
        if (get().projects === projects && get().activeProjectId === activeProjectId) set({ dirty: false })
        else mutate(() => ({}))
      } catch (e) {
        // dirty stays true; the next change reschedules and retries.
        if (!failedOnce) toast.error(e instanceof Error ? e.message : String(e))
        failedOnce = true
      }
    }, SAVE_DELAY_MS)
  }
  const mapProject = (id: string, fn: (p: TerminalProject) => TerminalProject) => (s: TerminalState) => ({
    projects: s.projects.map((p) => (p.id === id ? fn(p) : p)),
  })

  return {
    projects: [], activeProjectId: null, statuses: {}, focusedTerminalId: null, dirty: false,

    load: async () => {
      try {
        const d = await loadTerminalState()
        set({ projects: d.projects ?? [], activeProjectId: d.activeProjectId ?? null })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
      }
    },

    addProject: (path) => {
      const tab = makeTab(1)
      const project: TerminalProject = {
        id: uid(), path, name: path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path,
        collapsed: false, tabs: [tab], activeTabId: tab.id,
      }
      mutate((s) => ({ projects: [...s.projects, project], activeProjectId: project.id }))
    },

    removeProject: (id) => {
      const p = get().projects.find((x) => x.id === id)
      if (p) kill(p.tabs.flatMap((t) => leafIds(t.layout)))
      mutate((s) => ({
        projects: s.projects.filter((x) => x.id !== id),
        activeProjectId: s.activeProjectId === id ? (s.projects.find((x) => x.id !== id)?.id ?? null) : s.activeProjectId,
      }))
    },

    toggleCollapsed: (id) => mutate(mapProject(id, (p) => ({ ...p, collapsed: !p.collapsed }))),

    newTab: (projectId) =>
      mutate(mapProject(projectId, (p) => {
        const tab = makeTab(p.tabs.length + 1)
        return { ...p, tabs: [...p.tabs, tab], activeTabId: tab.id }
      })),

    closeTab: (projectId, tabId) => {
      const t = get().projects.find((p) => p.id === projectId)?.tabs.find((x) => x.id === tabId)
      if (t) kill(leafIds(t.layout))
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
      mutate(({ projects }) => ({
        projects: projects.map((p) => (p.id === hit.p.id ? { ...p, activeTabId: hit.t.id } : p)),
        activeProjectId: hit.p.id,
        focusedTerminalId: terminalId,
      }))
    },

    setStatus: (id, s) =>
      set((st) => {
        if (s === "idle") {
          const { [id]: _gone, ...rest } = st.statuses
          return { statuses: rest }
        }
        return { statuses: { ...st.statuses, [id]: s } }
      }),
  }
})
