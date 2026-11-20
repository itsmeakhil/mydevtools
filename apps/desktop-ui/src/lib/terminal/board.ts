import type { Attention, TerminalProject } from "@/store/terminal-store"
import { leafIds } from "./layout"
import type { TermStatus } from "./status"

export interface Card {
  id: string
  projectId: string
  projectName: string
  tabId: string
  tabName: string
  worktreeBranch?: string
  /** Set on a helper pane: the agent pane that started it. */
  parentId?: string
  /** Waiting/done: when it started needing you. */
  since?: number
  message?: string
}

export interface BoardColumns { blocked: Card[]; done: Card[]; running: Card[]; idle: Card[] }

/**
 * Panes grouped for triage: blocked and done oldest first (the longest wait on top),
 * running by how long it has run, idle in sidebar order.
 */
export function boardColumns(
  projects: TerminalProject[],
  statuses: Record<string, TermStatus>,
  attention: Record<string, Attention>,
  runningSince: Record<string, number>,
  children: Record<string, string[]> = {},
): BoardColumns {
  const parentOf = new Map(Object.entries(children).flatMap(([p, ids]) => ids.map((id) => [id, p] as const)))
  const cols: BoardColumns = { blocked: [], done: [], running: [], idle: [] }
  for (const p of projects)
    for (const tab of p.tabs)
      for (const id of leafIds(tab.layout)) {
        const a = attention[id]
        const card: Card = {
          id, projectId: p.id, projectName: p.name, tabId: tab.id, tabName: tab.name,
          ...(parentOf.has(id) && { parentId: parentOf.get(id) }),
          ...(tab.worktree && { worktreeBranch: tab.worktree.branch }),
          ...(a && { since: a.since, ...(a.message && { message: a.message }) }),
        }
        const s = statuses[id]
        const col = s === "waiting" ? cols.blocked : s === "done" ? cols.done : s === "running" ? cols.running : cols.idle
        col.push(card)
      }
  const bySince = (x: Card, y: Card) => (x.since ?? 0) - (y.since ?? 0)
  cols.blocked.sort(bySince)
  cols.done.sort(bySince)
  cols.running.sort((x, y) => (runningSince[x.id] ?? 0) - (runningSince[y.id] ?? 0))
  return cols
}
