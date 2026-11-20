/**
 * Thin wrappers over the Tauri terminal commands/events. `@tauri-apps/api` is
 * imported lazily (same as bridge.ts) so non-desktop bundles never pull it in.
 */
import { apiRequest } from "@/lib/backend-api"
import type { StatusSource, TermStatus } from "@/lib/terminal/status"
import type { TerminalPersisted } from "@/store/terminal-store"

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(cmd, args)
}

export type TerminalChunk = { type: "data"; b64: string } | { type: "exit"; code: number | null }

export const terminalSpawn = (req: {
  id: string; cwd: string; cols: number; rows: number; projectName: string
  /** Open in this live pane's current directory instead of `cwd`, when it has one. */
  inheritCwdFrom?: string
  /** Extra environment for a fresh session (secrets for a CLI); Rust refuses shell-altering names. */
  env?: Record<string, string>
  /** Lets Rust check the project's helper-pane opt-in for `mdt-term run`. */
  projectId?: string
}) =>
  invoke<{ id: string; cwd: string; cwdFallback: boolean; resume?: Resume }>("terminal_spawn", { req })

/** Agent that was running in a restored pane when the app quit (Claude's session id when known). */
export interface Resume { agent: string; session?: string }

export async function terminalAttach(id: string, onMessage: (m: TerminalChunk) => void) {
  const { Channel } = await import("@tauri-apps/api/core")
  const channel = new Channel<TerminalChunk>()
  channel.onmessage = onMessage
  await invoke<void>("terminal_attach", { id, channel })
}

export interface Worktree { path: string; branch: string }

/** A path printed in a pane that exists (resolved against the pane's current directory). */
export interface ResolvedPath { abs: string; isDir: boolean }
export const terminalResolvePaths = (id: string, paths: string[]) =>
  invoke<(ResolvedPath | null)[]>("terminal_resolve_paths", { id, paths })
/** Opens a path printed in pane `id`: a file at line:col in `editor`, a directory in Finder. */
export const terminalOpenPath = (id: string, path: string, line: number | undefined, col: number | undefined, editor: string) =>
  invoke<void>("terminal_open_path", { id, path, line: line ?? null, col: col ?? null, editor })
/** New branch + checkout for a task, beside the repo (`<repo>.worktrees/<slug>`). */
export const terminalWorktreeAdd = (path: string, name: string) => invoke<Worktree>("terminal_worktree_add", { path, name })
/** `git worktree remove` without --force; rejects with git's message when there are changes. */
export const terminalWorktreeRemove = (path: string) => invoke<void>("terminal_worktree_remove", { path })
export const terminalWrite = (id: string, b64: string) => invoke<void>("terminal_write", { id, b64 })
export const terminalResize = (id: string, cols: number, rows: number) =>
  invoke<void>("terminal_resize", { id, cols, rows })
export const terminalKill = (id: string) => invoke<void>("terminal_kill", { id })
/** Drop the saved scrollback (⌘K), so a remount doesn't replay what was cleared. */
export const terminalClearScrollback = (id: string) => invoke<void>("terminal_clear_scrollback", { id })
export const terminalGitInfo = (path: string, withChanged: boolean) =>
  invoke<{ branch: string | null; changed: number | null }>("terminal_git_info", { path, withChanged })
export const terminalStatuses = () => invoke<Record<string, TermStatus>>("terminal_statuses")
/** Last non-empty lines of a pane's rendered screen (board previews); `lines` is clamped to 1–40 in Rust. */
export const terminalScreenTail = (id: string, lines: number) => invoke<string>("terminal_screen_tail", { id, lines })
/** Save a pasted PNG (base64) as an owner-only file in the app's data dir; resolves to its path. */
export const terminalSaveImage = (pngB64: string) => invoke<string>("terminal_save_image", { pngB64 })
/** `<project>/.mydevtools/terminal.json` text, or null when the repo has none (symlinks refused). */
export const terminalProjectFileRead = (project: string) => invoke<string | null>("terminal_project_file_read", { project })
/** Replace that file atomically (creates `.mydevtools/`). */
export const terminalProjectFileWrite = (project: string, text: string) =>
  invoke<void>("terminal_project_file_write", { project, text })
export const terminalClearWaiting = (id: string) => invoke<void>("terminal_clear_waiting", { id })
export const terminalSetViewing = (id: string | null) => invoke<void>("terminal_set_viewing", { id })
export const terminalSetStrings = (waitingBody: string, doneBody: string, failedBody: string, quitTitle: string) =>
  invoke<void>("terminal_set_strings", { waitingBody, doneBody, failedBody, quitTitle })
/** Which notifications Rust shows (the Dock badge always counts), and whether they play a sound. */
export const terminalSetNotify = (blocked: boolean, done: boolean, sound: boolean) =>
  invoke<void>("terminal_set_notify", { blocked, done, sound })
/** Whether agents in this project may start helper panes; Rust refuses `run` for projects it wasn't told about. */
export const terminalSetProjectPrefs = (projectId: string, agentsCanSpawn: boolean) =>
  invoke<void>("terminal_set_project_prefs", { projectId, agentsCanSpawn })
export const appQuitConfirmed = () => invoke<void>("app_quit_confirmed")
export const appQuitCancelled = () => invoke<void>("app_quit_cancelled")

async function on<T>(event: string, cb: (p: T) => void): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event")
  return listen<T>(event, (e) => cb(e.payload))
}
/** How a long shell command ended (sent with the status it caused). */
export interface CommandEnd { code: number | null; ms: number }
export const onTerminalStatus = (cb: (p: { id: string; status: TermStatus; message?: string | null; command?: CommandEnd | null; source?: StatusSource }) => void) =>
  on("terminal://status", cb)
/** Pane's foreground agent changed: manifest id (`codex`, `claude`…) or null. */
export const onTerminalAgent = (cb: (p: { id: string; agent: string | null }) => void) => on("terminal://agent", cb)
export const onTerminalFocus = (cb: (p: { id: string }) => void) => on("terminal://focus", cb)
export const onQuitRequested = (cb: (p: { count: number }) => void) => on("terminal://quit-requested", cb)
export const onClosePane = (cb: (p: { id: string }) => void) => on("terminal://close-pane", cb)

export const loadTerminalState = () => apiRequest<TerminalPersisted>("GET", "/api/v1/terminal/state")
export const saveTerminalState = (state: TerminalPersisted) =>
  apiRequest<unknown>("PUT", "/api/v1/terminal/state", state).then(() => undefined)
/** An agent started a helper pane (Rust already spawned its session under `id`). */
export const onTerminalSpawnChild = (cb: (p: { parent: string; id: string; name: string | null; cwd: string }) => void) =>
  on("terminal://spawn-child", cb)
/** A helper pane was closed (drop its pane) or its process exited (keep it: output, exit banner). */
export const onTerminalChildClosed = (cb: (p: { id: string; parent: string; reason: "closed" | "exited" }) => void) =>
  on("terminal://child-closed", cb)
