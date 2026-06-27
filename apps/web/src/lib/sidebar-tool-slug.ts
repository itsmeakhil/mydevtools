/**
 * Derives the RBAC tool-matrix key from a sidebar URL.
 *
 * Examples:
 *   "/app/password-manager"  → "password-manager"
 *   "/app/notes"             → "notes"
 *   "/dashboard"             → null  (no matrix entry — always render)
 *   "/settings"              → null
 */
export function sidebarUrlToToolSlug(url: string): string | null {
  const match = url.match(/^\/app\/([a-z0-9-]+)/)
  return match ? match[1] : null
}
