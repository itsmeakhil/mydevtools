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

/**
 * Control characters (Ctrl-P/Ctrl-R would replay shell history; newlines would run extra lines),
 * bidi overrides and zero-width characters can make what runs differ from what the trust
 * dialog shows, so none are allowed in anything from the file.
 */
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const str = (v: unknown, max: number = LIMITS.text): v is string => typeof v === "string" && v.length <= max && !UNSAFE.test(v)
const optStr = (v: unknown) => v === undefined || str(v)

/** Smallest share (%) a pane gets, so a file can't hide a running pane. */
const MIN_SIZE = 5

/** Sizes summing to 100, each ≥ MIN_SIZE, in the given proportions (equal when they can't be used). */
function normalizeSizes(sizes: number[]): number[] {
  const total = sizes.reduce((a, b) => a + b, 0)
  const share = (x: number) => (Number.isFinite(total) && total > 0 ? x / total : 1 / sizes.length)
  return sizes.map((x) => Math.round((MIN_SIZE + (100 - MIN_SIZE * sizes.length) * share(x)) * 100) / 100)
}

/** The layout rebuilt from validated fields only (anything else in the file is dropped), or null. */
function cleanLayout(n: unknown, depth = 0): { node: SplitNode; leaves: number } | null {
  if (!isObj(n) || depth > LIMITS.depth) return null
  if (n.kind === "leaf") return str(n.id, 64) ? { node: { kind: "leaf", id: n.id }, leaves: 1 } : null
  if (n.kind !== "split" || (n.dir !== "row" && n.dir !== "col")) return null
  const { children, sizes } = n
  if (!Array.isArray(children) || children.length < 2 || !Array.isArray(sizes) || sizes.length !== children.length) return null
  if (!sizes.every((x) => typeof x === "number" && Number.isFinite(x) && x > 0)) return null
  const kids: SplitNode[] = []
  let leaves = 0
  for (const c of children) {
    const k = cleanLayout(c, depth + 1)
    if (!k) return null
    kids.push(k.node)
    leaves += k.leaves
  }
  return { node: { kind: "split", dir: n.dir, children: kids, sizes: normalizeSizes(sizes as number[]) }, leaves }
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
    if (!isObj(c) || !str(c.name, 200) || !str(c.command) || !c.command.trim())
      return { ok: false, error: "each command needs a name and a command (plain text, no control characters)" }
  if (!Array.isArray(workspaces) || workspaces.length > LIMITS.workspaces) return { ok: false, error: "workspaces must be a list" }
  const cleanWorkspaces: Workspace[] = []
  for (const w of workspaces) {
    if (!isObj(w) || !str(w.name, 200) || !optStr(w.worktree)) return { ok: false, error: "each workspace needs a name; text only, no control characters" }
    const layout = cleanLayout(w.layout)
    if (!layout || layout.leaves > LIMITS.panes) return { ok: false, error: `workspace "${w.name}": invalid layout (1–${LIMITS.panes} panes)` }
    if (w.panes !== undefined) {
      if (!Array.isArray(w.panes) || w.panes.length > layout.leaves) return { ok: false, error: `workspace "${w.name}": more panes than the layout has` }
      for (const p of w.panes)
        if (!isObj(p) || !optStr(p.command) || !optStr(p.env)) return { ok: false, error: `workspace "${w.name}": pane command and env must be plain text` }
    }
    cleanWorkspaces.push({
      name: w.name,
      layout: layout.node,
      ...(typeof w.worktree === "string" && { worktree: w.worktree }),
      ...(Array.isArray(w.panes) && {
        panes: (w.panes as Record<string, unknown>[]).map((p) => ({
          ...(typeof p.command === "string" && { command: p.command }),
          ...(typeof p.env === "string" && { env: p.env }),
        })),
      }),
    })
  }
  return {
    ok: true,
    config: {
      version: 1,
      commands: (commands as { name: string; command: string }[]).map(({ name, command }) => ({ name, command })),
      workspaces: cleanWorkspaces,
    },
  }
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
