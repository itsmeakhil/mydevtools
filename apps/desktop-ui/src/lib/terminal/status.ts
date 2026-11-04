import type { TerminalProject } from "@/store/terminal-store"
import { leafIds } from "./layout"

export type TermStatus = "idle" | "running" | "waiting"

export interface NeedsYouItem {
  terminalId: string
  projectId: string
  projectName: string
  terminalName: string
}

export function needsYou(projects: TerminalProject[], statuses: Record<string, TermStatus>): NeedsYouItem[] {
  const out: NeedsYouItem[] = []
  for (const p of projects)
    for (const t of p.tabs)
      for (const id of leafIds(t.layout))
        if (statuses[id] === "waiting")
          out.push({ terminalId: id, projectId: p.id, projectName: p.name, terminalName: t.terminalNames[id] ?? t.name })
  return out
}

export const projectWaitingCount = (p: TerminalProject, statuses: Record<string, TermStatus>) =>
  p.tabs.reduce((n, t) => n + leafIds(t.layout).filter((id) => statuses[id] === "waiting").length, 0)

/** Counts only terminals that still exist in `projects` (closed panes can't inflate it). */
export const totalWaiting = (projects: TerminalProject[], statuses: Record<string, TermStatus>) =>
  projects.reduce((n, p) => n + projectWaitingCount(p, statuses), 0)
