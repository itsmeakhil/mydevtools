import type { TerminalProject } from "@/store/terminal-store"
import { leafIds } from "./layout"

/** waiting = blocked on the user; done = finished a turn, ready for review. */
export type TermStatus = "idle" | "running" | "waiting" | "done"

/** Who reported a status: the program itself (hooks, OSC 7501), the shell (OSC 133), or the screen reader. */
export type StatusSource = "program" | "shell" | "screen"

/** Waiting or done: shown in Needs-you, counted on badges, cleared by looking at the pane. */
export const needsAttention = (s: TermStatus | undefined): s is "waiting" | "done" => s === "waiting" || s === "done"

export interface NeedsYouItem {
  terminalId: string
  status: "waiting" | "done"
  projectId: string
  projectName: string
  terminalName: string
}

/** Blocked panes first, then finished ones; project/tab order within each. */
export function needsYou(projects: TerminalProject[], statuses: Record<string, TermStatus>): NeedsYouItem[] {
  const out: NeedsYouItem[] = []
  for (const p of projects)
    for (const t of p.tabs)
      for (const id of leafIds(t.layout)) {
        const status = statuses[id]
        if (needsAttention(status))
          out.push({ terminalId: id, status, projectId: p.id, projectName: p.name, terminalName: t.terminalNames[id] ?? t.name })
      }
  return out.sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))
}

export const projectWaitingCount = (p: TerminalProject, statuses: Record<string, TermStatus>) =>
  p.tabs.reduce((n, t) => n + leafIds(t.layout).filter((id) => needsAttention(statuses[id])).length, 0)

/** Counts only terminals that still exist in `projects` (closed panes can't inflate it). */
export const totalWaiting = (projects: TerminalProject[], statuses: Record<string, TermStatus>) =>
  projects.reduce((n, p) => n + projectWaitingCount(p, statuses), 0)

/** Panes that just started needing you (entered waiting/done, or switched between them). */
export const newlyNeedingYou = (prev: Record<string, TermStatus>, next: Record<string, TermStatus>) =>
  Object.keys(next).filter((id) => needsAttention(next[id]) && prev[id] !== next[id])
