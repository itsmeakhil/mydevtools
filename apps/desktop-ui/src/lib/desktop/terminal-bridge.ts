/**
 * Thin wrappers over the Tauri terminal commands/events. `@tauri-apps/api` is
 * imported lazily (same as bridge.ts) so non-desktop bundles never pull it in.
 */
import { apiRequest } from "@/lib/backend-api"
import type { TermStatus } from "@/lib/terminal/status"
import type { TerminalPersisted } from "@/store/terminal-store"

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(cmd, args)
}

export type TerminalChunk = { type: "data"; b64: string } | { type: "exit"; code: number | null }

export const terminalSpawn = (req: { id: string; cwd: string; cols: number; rows: number; projectName: string }) =>
  invoke<{ id: string; cwd: string; cwdFallback: boolean }>("terminal_spawn", { req })

export async function terminalAttach(id: string, onMessage: (m: TerminalChunk) => void) {
  const { Channel } = await import("@tauri-apps/api/core")
  const channel = new Channel<TerminalChunk>()
  channel.onmessage = onMessage
  await invoke<void>("terminal_attach", { id, channel })
}

export const terminalWrite = (id: string, b64: string) => invoke<void>("terminal_write", { id, b64 })
export const terminalResize = (id: string, cols: number, rows: number) =>
  invoke<void>("terminal_resize", { id, cols, rows })
export const terminalKill = (id: string) => invoke<void>("terminal_kill", { id })
export const terminalGitInfo = (path: string, withChanged: boolean) =>
  invoke<{ branch: string | null; changed: number | null }>("terminal_git_info", { path, withChanged })
export const terminalStatuses = () => invoke<Record<string, TermStatus>>("terminal_statuses")
export const terminalClearWaiting = (id: string) => invoke<void>("terminal_clear_waiting", { id })
export const terminalSetViewing = (id: string | null) => invoke<void>("terminal_set_viewing", { id })
export const terminalSetStrings = (waitingBody: string, quitTitle: string) =>
  invoke<void>("terminal_set_strings", { waitingBody, quitTitle })
export const appQuitConfirmed = () => invoke<void>("app_quit_confirmed")
export const appQuitCancelled = () => invoke<void>("app_quit_cancelled")

async function on<T>(event: string, cb: (p: T) => void): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event")
  return listen<T>(event, (e) => cb(e.payload))
}
export const onTerminalStatus = (cb: (p: { id: string; status: TermStatus; message?: string | null }) => void) =>
  on("terminal://status", cb)
export const onTerminalFocus = (cb: (p: { id: string }) => void) => on("terminal://focus", cb)
export const onQuitRequested = (cb: (p: { count: number }) => void) => on("terminal://quit-requested", cb)
export const onClosePane = (cb: (p: { id: string }) => void) => on("terminal://close-pane", cb)

export const loadTerminalState = () => apiRequest<TerminalPersisted>("GET", "/api/v1/terminal/state")
export const saveTerminalState = (state: TerminalPersisted) =>
  apiRequest<unknown>("PUT", "/api/v1/terminal/state", state).then(() => undefined)
