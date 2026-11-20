import type { SplitNode } from "./layout"

/**
 * `.mydevtools/terminal.json`: a project's shared launch commands and workspaces, committed
 * with the repo. Environments are referenced by Environment Manager set **name**; values never
 * live in the file. Nothing in it runs before the user trusts its exact content (see trust.ts).
 */
export interface WorkspacePane { command?: string; env?: string }
export interface Workspace {
  name: string
  layout: SplitNode
  /** Open the whole workspace as a task in its own git worktree (branch = this name, slugged). */
  worktree?: string
  /** One per pane, in the layout's pane order. */
  panes?: WorkspacePane[]
}
export interface ProjectConfigV1 {
  $schema?: string
  version: 1
  commands?: { name: string; command: string }[]
  workspaces?: Workspace[]
}

export const SCHEMA_URL = "https://raw.githubusercontent.com/itsmeakhil/mydevtools/main/docs/terminal-config.schema.json"
const LIMITS = { commands: 64, workspaces: 32, panes: 16, depth: 6, text: 4096 } as const

type Parsed = { ok: true; config: ProjectConfigV1 } | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const str = (v: unknown, max: number = LIMITS.text): v is string => typeof v === "string" && v.length <= max
const optStr = (v: unknown) => v === undefined || str(v)

/** Leaf count of a well-formed layout, or -1. */
function layoutLeaves(n: unknown, depth = 0): number {
  if (!isObj(n) || depth > LIMITS.depth) return -1
  if (n.kind === "leaf") return str(n.id, 64) ? 1 : -1
  if (n.kind !== "split" || (n.dir !== "row" && n.dir !== "col")) return -1
  const { children, sizes } = n
  if (!Array.isArray(children) || children.length < 2 || !Array.isArray(sizes) || sizes.length !== children.length) return -1
  if (!sizes.every((x) => typeof x === "number" && Number.isFinite(x) && x > 0)) return -1
  let total = 0
  for (const c of children) {
    const k = layoutLeaves(c, depth + 1)
    if (k < 0) return -1
    total += k
  }
  return total
}

export function parseProjectConfig(text: string): Parsed {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  if (!isObj(raw) || raw.version !== 1) return { ok: false, error: "unsupported version (expected 1)" }
  const { commands = [], workspaces = [] } = raw
  if (!Array.isArray(commands) || commands.length > LIMITS.commands) return { ok: false, error: "commands must be a list" }
  for (const c of commands)
    if (!isObj(c) || !str(c.name, 200) || !str(c.command) || !c.command.trim()) return { ok: false, error: "each command needs a name and a command" }
  if (!Array.isArray(workspaces) || workspaces.length > LIMITS.workspaces) return { ok: false, error: "workspaces must be a list" }
  for (const w of workspaces) {
    if (!isObj(w) || !str(w.name, 200) || !optStr(w.worktree)) return { ok: false, error: "each workspace needs a name" }
    const leaves = layoutLeaves(w.layout)
    if (leaves < 1 || leaves > LIMITS.panes) return { ok: false, error: `workspace "${w.name}": invalid layout (1–${LIMITS.panes} panes)` }
    if (w.panes !== undefined) {
      if (!Array.isArray(w.panes) || w.panes.length > leaves) return { ok: false, error: `workspace "${w.name}": more panes than the layout has` }
      for (const p of w.panes)
        if (!isObj(p) || !optStr(p.command) || !optStr(p.env)) return { ok: false, error: `workspace "${w.name}": pane command and env must be text` }
    }
  }
  return { ok: true, config: raw as unknown as ProjectConfigV1 }
}

/** Same shape with pane ids p1, p2, … (live ids are random and meaningless in a file). */
function readableIds(n: SplitNode, next = { i: 0 }): SplitNode {
  return n.kind === "leaf"
    ? { kind: "leaf", id: `p${++next.i}` }
    : { kind: "split", dir: n.dir, children: n.children.map((c) => readableIds(c, next)), sizes: n.sizes.map((x) => Math.round(x * 100) / 100) }
}

/** Stable, diff-friendly text: fixed key order, 2-space indent, trailing newline. */
export function serializeProjectConfig(c: ProjectConfigV1): string {
  const out = {
    $schema: SCHEMA_URL,
    version: 1,
    ...(c.commands?.length && { commands: c.commands.map(({ name, command }) => ({ name, command })) }),
    ...(c.workspaces?.length && {
      workspaces: c.workspaces.map((w) => ({
        name: w.name,
        layout: readableIds(w.layout),
        ...(w.worktree && { worktree: w.worktree }),
        ...(w.panes?.length && { panes: w.panes.map((p) => ({ ...(p.command && { command: p.command }), ...(p.env && { env: p.env }) })) }),
      })),
    }),
  }
  return JSON.stringify(out, null, 2) + "\n"
}
