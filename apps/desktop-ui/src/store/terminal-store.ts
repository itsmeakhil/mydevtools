import { create } from "zustand"
import { toast } from "sonner"
import { cloneLayout, leaf, splitAt, removeLeaf, leafIds, setSizes, replaceLeaf, type SplitNode } from "@/lib/terminal/layout"
import { needsAttention, type TermStatus } from "@/lib/terminal/status"
import { loadTerminalState, saveTerminalState, terminalKill, type CommandEnd, type Worktree } from "@/lib/desktop/terminal-bridge"
import { clampFontSize, DEFAULT_PREFS, FONT_SIZE, normalizePrefs, type TerminalPrefs } from "@/lib/terminal/util"

export interface TerminalTab {
  id: string; name: string; layout: SplitNode; terminalNames: Record<string, string>
  /** Tab opened as a task in its own git worktree: its panes start there instead of the project folder. */
  worktree?: Worktree
}
export interface TerminalProject {
  id: string; path: string; name: string; collapsed: boolean; tabs: TerminalTab[]; activeTabId: string | null
  /** Highest tab number handed out, so closing tab 1 of [1, 2] still makes the next one 3. */
  tabSeq?: number
  /** Saved launch commands ("dev server" → `npm run dev`), offered in the new-tab menu. */
  commands?: SavedCommand[]
  /** Saved tab layouts (split shape only), offered in the new-tab menu. */
  layouts?: SavedLayout[]
}

export interface SavedLayout { name: string; layout: SplitNode }

export interface SavedCommand { name: string; command: string }

/** Number for the project's next untitled tab. Older saves lack `tabSeq`: use the highest trailing number in tab names. */
export const nextTabNumber = (p: Pick<TerminalProject, "tabs" | "tabSeq">) =>
  (p.tabSeq ?? Math.max(p.tabs.length, ...p.tabs.map((t) => Number(/\s(\d+)$/.exec(t.name)?.[1] ?? 0)))) + 1
export interface TerminalPersisted {
  projects: TerminalProject[]; activeProjectId: string | null
  /** Shared by every pane (⌘+ / ⌘− / ⌘0). Older saves lack it. */
  fontSize?: number
  /** ⌥ sends Meta (readline word jumps) instead of typing ⌥ characters. Off by default: non-US layouts type @ € etc. with ⌥. */
  optionAsMeta?: boolean
  /** Older saves lack it; normalized on load. */
  prefs?: Partial<TerminalPrefs>
}

export interface Attention {
  since: number
  message?: string
  /** Set when a long shell command's end caused it. */
  command?: CommandEnd
}

interface TerminalState extends TerminalPersisted {
  statuses: Record<string, TermStatus>
  /** When each running pane started running (ms); not persisted. */
  runningSince: Record<string, number>
  /** Coding agent running in the foreground of a pane (manifest id); not persisted. */
  agents: Record<string, string>
  /** Waiting panes: when they started waiting and the program's reason, if it gave one. Not persisted. */
  attention: Record<string, Attention>
  /** Live window titles set by the shell/program (OSC 0/2); not persisted. */
  titles: Record<string, string>
  fontSize: number
  optionAsMeta: boolean
  prefs: TerminalPrefs
  setPrefs: (patch: Partial<TerminalPrefs>) => void
  /** Live current directory per pane from OSC 7; not persisted. */
  cwds: Record<string, string>
  /** Pane maximized over its tab (⌘⇧↵); only honoured while it is also the focused pane. Not persisted. */
  zoomedId: string | null
  /** New pane id → the pane whose current directory it opens in (read once at spawn); not persisted. */
  cwdFrom: Record<string, string>
  /** New pane id → command to run once its shell starts (read once at spawn); not persisted. */
  runOnStart: Record<string, string>
  /** New pane id → extra environment for its process (secrets; read once at spawn); never persisted. */
  envOnStart: Record<string, Record<string, string>>
  focusedTerminalId: string | null
  dirty: boolean
  loaded: boolean
  load: () => Promise<void>
  /** Save a pending debounced change now; resolves once no save is in flight. */
  flushNow: () => Promise<void>
  addProject: (path: string, firstTabName?: string) => void
  removeProject: (id: string) => void
  toggleCollapsed: (id: string) => void
  selectProject: (id: string) => void
  /** `run` is typed into the new pane's shell once it has started; `worktree` makes it a worktree task tab. */
  newTab: (projectId: string, name?: string, opts?: { run?: string; env?: Record<string, string>; worktree?: Worktree; layout?: SplitNode }) => void
  takeEnvOnStart: (terminalId: string) => Record<string, string> | undefined
  /** Save a tab's split shape under its name; `removeLayout` by index. */
  saveLayout: (projectId: string, tabId: string) => void
  removeLayout: (projectId: string, index: number) => void
  /** The command queued for a pane's first start, removed as it's read. */
  takeRunOnStart: (terminalId: string) => string | undefined
  addCommand: (projectId: string, cmd: SavedCommand) => void
  removeCommand: (projectId: string, index: number) => void
  closeTab: (projectId: string, tabId: string) => void
  renameTab: (projectId: string, tabId: string, name: string) => void
  /** Move tab `fromId` into `toId`'s position within the project (drag-and-drop reorder). */
  moveTab: (projectId: string, fromId: string, toId: string) => void
  /** Custom pane name; blank clears it so the label falls back to the shell's window title. */
  renameTerminal: (terminalId: string, name: string) => void
  split: (terminalId: string, dir: "row" | "col") => void
  closeTerminal: (terminalId: string) => void
  /** Replace an exited pane with a fresh shell in the same slot, opening in its last directory. */
  restartTerminal: (terminalId: string) => void
  toggleZoom: (terminalId: string) => void
  resize: (tabId: string, path: number[], sizes: number[]) => void
  focusTerminal: (terminalId: string) => void
  setStatus: (id: string, s: TermStatus, message?: string, command?: CommandEnd) => void
  setAgent: (id: string, agent: string | null) => void
  setTitle: (id: string, title: string) => void
  setFontSize: (size: number) => void
  setOptionAsMeta: (on: boolean) => void
  setCwd: (id: string, cwd: string) => void
}

const uid = () => crypto.randomUUID()
const makeTab = (n: number, name?: string): TerminalTab => ({ id: uid(), name: name || `Terminal ${n}`, layout: leaf(uid()), terminalNames: {} })
const kill = (ids: string[]) => ids.forEach((id) => terminalKill(id).catch(() => {}))
const find = (projects: TerminalProject[], terminalId: string) => {
  for (const p of projects)
    for (const t of p.tabs) if (leafIds(t.layout).includes(terminalId)) return { p, t }
  return null
}

/** Whether any project's layout still holds this terminal (false once its pane was closed). */
export const terminalExists = (terminalId: string) => find(useTerminalStore.getState().projects, terminalId) !== null

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
        const { projects, activeProjectId, fontSize, optionAsMeta, prefs } = get()
        try {
          await saveTerminalState({ projects, activeProjectId, fontSize, optionAsMeta, prefs })
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
      const attention = { ...s.attention }
      const agents = { ...s.agents }
      const runningSince = { ...s.runningSince }
      ids.forEach((id) => {
        delete runningSince[id]
        delete statuses[id]
        delete attention[id]
        delete agents[id]
      })
      return { statuses, attention, agents, runningSince }
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
          fontSize: s.dirty || d.fontSize === undefined ? s.fontSize : clampFontSize(d.fontSize),
          optionAsMeta: s.dirty || d.optionAsMeta === undefined ? s.optionAsMeta : d.optionAsMeta === true,
          prefs: s.dirty || d.prefs === undefined ? s.prefs : normalizePrefs(d.prefs),
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
    projects: [], activeProjectId: null, statuses: {}, attention: {}, agents: {}, runningSince: {}, titles: {}, fontSize: FONT_SIZE.default, cwdFrom: {}, runOnStart: {}, envOnStart: {},
    optionAsMeta: false, prefs: DEFAULT_PREFS, cwds: {}, zoomedId: null,
    focusedTerminalId: null, dirty: false, loaded: false,

    // Idempotent: a no-op once loaded; concurrent callers share one request.
    load: () => {
      if (get().loaded) return Promise.resolve()
      loading ??= doLoad().finally(() => (loading = null))
      return loading
    },

    flushNow: async () => {
      clearTimeout(timer)
      if (get().dirty) flush()
      while (inflight) await inflight
    },

    addProject: (path, firstTabName) => {
      const tab = makeTab(1, firstTabName)
      const project: TerminalProject = {
        id: uid(), path, name: path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path,
        collapsed: false, tabs: [tab], activeTabId: tab.id, tabSeq: 1,
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

    // Opens where the focused pane is, when that pane belongs to this project.
    newTab: (projectId, name, { run, env, worktree, layout } = {}) => {
      const p = get().projects.find((x) => x.id === projectId)
      if (!p) return
      const n = nextTabNumber(p)
      const tab: TerminalTab = {
        ...makeTab(n, name),
        ...(worktree && { worktree }),
        ...(layout && { layout: cloneLayout(layout, uid) }),
      }
      const ids = leafIds(tab.layout)
      const leafId = ids[0]
      const from = get().focusedTerminalId
      // A worktree tab starts in its worktree, not wherever the focused pane is.
      if (!worktree && from && find([p], from))
        set((s) => ({ cwdFrom: { ...s.cwdFrom, ...Object.fromEntries(ids.map((id) => [id, from])) } }))
      if (run?.trim()) set((s) => ({ runOnStart: { ...s.runOnStart, [leafId]: run.trim() } }))
      if (env && Object.keys(env).length) set((s) => ({ envOnStart: { ...s.envOnStart, [leafId]: env } }))
      mutate(mapProject(projectId, (x) => ({ ...x, tabs: [...x.tabs, tab], activeTabId: tab.id, tabSeq: n })))
    },

    takeRunOnStart: (terminalId) => {
      const run = get().runOnStart[terminalId]
      if (run !== undefined)
        set((s) => {
          const { [terminalId]: _taken, ...rest } = s.runOnStart
          return { runOnStart: rest }
        })
      return run
    },

    takeEnvOnStart: (terminalId) => {
      const env = get().envOnStart[terminalId]
      if (env)
        set((s) => {
          const { [terminalId]: _taken, ...rest } = s.envOnStart
          return { envOnStart: rest }
        })
      return env
    },

    addCommand: (projectId, cmd) => {
      const name = cmd.name.trim()
      const command = cmd.command.trim()
      if (!command) return
      mutate(mapProject(projectId, (p) => ({ ...p, commands: [...(p.commands ?? []), { name: name || command, command }] })))
    },

    saveLayout: (projectId, tabId) => {
      const tab = get().projects.find((p) => p.id === projectId)?.tabs.find((t) => t.id === tabId)
      if (!tab || tab.layout.kind === "leaf") return // a single pane is just "New tab"
      mutate(mapProject(projectId, (p) => ({ ...p, layouts: [...(p.layouts ?? []), { name: tab.name, layout: tab.layout }] })))
    },

    removeLayout: (projectId, index) =>
      mutate(mapProject(projectId, (p) => ({ ...p, layouts: (p.layouts ?? []).filter((_, i) => i !== index) }))),

    removeCommand: (projectId, index) =>
      mutate(mapProject(projectId, (p) => ({ ...p, commands: (p.commands ?? []).filter((_, i) => i !== index) }))),

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

    moveTab: (projectId, fromId, toId) => {
      const tabs = get().projects.find((p) => p.id === projectId)?.tabs ?? []
      const from = tabs.findIndex((t) => t.id === fromId)
      const to = tabs.findIndex((t) => t.id === toId)
      if (from < 0 || to < 0 || from === to) return
      const next = [...tabs]
      next.splice(to, 0, ...next.splice(from, 1))
      mutate(mapProject(projectId, (p) => ({ ...p, tabs: next })))
    },

    renameTerminal: (terminalId, name) => {
      const hit = find(get().projects, terminalId)
      if (!hit) return
      const terminalNames = { ...hit.t.terminalNames }
      if (name.trim()) terminalNames[terminalId] = name.trim()
      else delete terminalNames[terminalId]
      mutate(mapProject(hit.p.id, (p) => ({
        ...p,
        tabs: p.tabs.map((t) => (t.id === hit.t.id ? { ...t, terminalNames } : t)),
      })))
    },

    split: (terminalId, dir) => {
      const hit = find(get().projects, terminalId)
      if (!hit) return
      const newId = uid()
      mutate(mapProject(hit.p.id, (p) => ({
        ...p,
        tabs: p.tabs.map((t) => (t.id === hit.t.id ? { ...t, layout: splitAt(t.layout, terminalId, dir, newId) } : t)),
      })))
      set((s) => ({ focusedTerminalId: newId, zoomedId: null, cwdFrom: { ...s.cwdFrom, [newId]: terminalId } }))
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

    restartTerminal: (oldId) => {
      const hit = find(get().projects, oldId)
      if (!hit) return
      // The exited session stays in Rust until the new pane has spawned from its cwd (the pane kills it then).
      const newId = uid()
      dropStatuses([oldId])
      const { [oldId]: name, ...rest } = hit.t.terminalNames
      const terminalNames = name ? { ...rest, [newId]: name } : rest
      mutate(mapProject(hit.p.id, (p) => ({
        ...p,
        tabs: p.tabs.map((t) => (t.id === hit.t.id ? { ...t, layout: replaceLeaf(t.layout, oldId, newId), terminalNames } : t)),
      })))
      set((s) => ({
        cwdFrom: { ...s.cwdFrom, [newId]: oldId },
        focusedTerminalId: s.focusedTerminalId === oldId ? newId : s.focusedTerminalId,
      }))
    },

    toggleZoom: (terminalId) => {
      const hit = find(get().projects, terminalId)
      if (!hit || leafIds(hit.t.layout).length < 2) return
      set((s) => ({ zoomedId: s.zoomedId === terminalId ? null : terminalId, focusedTerminalId: terminalId }))
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

    setStatus: (id, s, message, command) =>
      set((st) => {
        if (!find(st.projects, id)) return st
        const { [id]: was, ...attention } = st.attention
        const { [id]: started, ...runningSince } = st.runningSince
        if (s === "running") runningSince[id] = started ?? Date.now()
        if (needsAttention(s))
          // Still waiting (e.g. a replay): keep when it started; a new reason replaces the old one.
          attention[id] = { since: was?.since ?? Date.now(), message: message || was?.message, command: command ?? was?.command }
        if (s === "idle") {
          const { [id]: _gone, ...rest } = st.statuses
          return { statuses: rest, attention, runningSince }
        }
        return { statuses: { ...st.statuses, [id]: s }, attention, runningSince }
      }),

    setAgent: (id, agent) =>
      set((st) => {
        if (!find(st.projects, id) || (st.agents[id] ?? null) === agent) return st
        const { [id]: _gone, ...agents } = st.agents
        return { agents: agent ? { ...agents, [id]: agent } : agents }
      }),

    // ponytail: titles of closed panes are never pruned (a few bytes per uuid per session).
    setTitle: (id, title) => set((st) => (st.titles[id] === title ? st : { titles: { ...st.titles, [id]: title } })),

    setFontSize: (size) => {
      const fontSize = clampFontSize(size)
      if (fontSize !== get().fontSize) mutate(() => ({ fontSize }))
    },

    setPrefs: (patch) => {
      const prefs = normalizePrefs({ ...get().prefs, ...patch })
      if (Object.entries(prefs).some(([k, v]) => get().prefs[k as keyof TerminalPrefs] !== v)) mutate(() => ({ prefs }))
    },

    setOptionAsMeta: (on) => {
      if (on !== get().optionAsMeta) mutate(() => ({ optionAsMeta: on }))
    },

    setCwd: (id, cwd) => set((st) => (st.cwds[id] === cwd ? st : { cwds: { ...st.cwds, [id]: cwd } })),
  }
})
