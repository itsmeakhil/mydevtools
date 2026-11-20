import { leafIds } from "./layout"
import type { Workspace } from "./project-config"

/** Per pane, in layout order: the command to run and the Environment Manager set to load. */
export interface PanePlan { run?: string; envName?: string }

export function planWorkspace(ws: Workspace): PanePlan[] {
  return leafIds(ws.layout).map((_, i) => {
    const p = ws.panes?.[i]
    return { ...(p?.command && { run: p.command }), ...(p?.env && { envName: p.env }) }
  })
}

/** Anything that runs a command, loads secrets or creates a worktree needs the file trusted first. */
export const needsTrust = (ws: Workspace) => !!ws.worktree || !!ws.panes?.some((p) => p.command || p.env)
