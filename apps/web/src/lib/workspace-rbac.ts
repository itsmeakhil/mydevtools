import { useActiveWorkspace } from "@/store/workspace-store"
import type { Workspace } from "@/lib/workspace-api"

export type Permission = "read" | "write" | "delete" | "admin"
export type WsRole = "admin" | "developer" | "viewer"

export const ENCRYPTED_TOOLS: Set<string> = new Set([
  "password-manager",
  "environment-manager",
  "api-key-vault",
])

const FULL: Set<Permission> = new Set(["read", "write", "delete", "admin"])
const EDITOR: Set<Permission> = new Set(["read", "write", "delete"])
const READER: Set<Permission> = new Set(["read"])
const NONE: Set<Permission> = new Set()

const PLAINTEXT_ROW = { admin: FULL, developer: EDITOR, viewer: READER }
const ENCRYPTED_ROW = { admin: NONE, developer: NONE, viewer: NONE }

export const TOOL_PERMISSIONS: Record<string, Record<WsRole, Set<Permission>>> = {
  // Encrypted tools — Personal-only in B (all roles empty in shared workspaces)
  "password-manager":    ENCRYPTED_ROW,
  "environment-manager": ENCRYPTED_ROW,
  "api-key-vault":       ENCRYPTED_ROW,

  // Plaintext tools
  "notes":           PLAINTEXT_ROW,
  "bookmarks":       PLAINTEXT_ROW,
  "tasks":           PLAINTEXT_ROW,
  "code-snippets":   PLAINTEXT_ROW,
  "api-client":      PLAINTEXT_ROW,
  "nosql-explorer":  PLAINTEXT_ROW,
  "sql-client":      PLAINTEXT_ROW,
  "redis-commander": PLAINTEXT_ROW,
  "s3-drive":        PLAINTEXT_ROW,
  "json-formatter":  PLAINTEXT_ROW,
  "url-shortener":   PLAINTEXT_ROW,
  "dns-lookup":      PLAINTEXT_ROW,
}

export function hasPermission(
  ws: Workspace,
  tool: string,
  permission: Permission,
): boolean {
  if (ws.is_personal) return true
  const row = TOOL_PERMISSIONS[tool]
  if (!row) return false
  return row[ws.ws_role]?.has(permission) ?? false
}

/**
 * React hook for checking tool permission in the active workspace. Returns `false` until the workspace
 * store is hydrated (component should not gate rendering on this — guard
 * with `useWorkspaceStore().hydrated`).
 */
export function useToolPermission(tool: string, permission: Permission): boolean {
  const ws = useActiveWorkspace()
  if (!ws) return false
  return hasPermission(ws, tool, permission)
}
