/**
 * Canonical `/app/...` paths for pinned tools (sidebar + dashboard).
 * Tool UTM may pass a slug (e.g. `snippet-manager`); sidebar uses `/app/snippet-manager`.
 */
export function normalizePinnedToolPath(raw: string): string {
  let path = raw.trim();
  if (!path) return path;

  path = path.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  if (!path.startsWith("/")) {
    path = path.startsWith("app/") ? `/${path}` : `/app/${path}`;
  }

  return path;
}

/** Dedupe while preserving first-seen order. Drops empty segments after normalize. */
export function normalizePinnedToolsList(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const n = normalizePinnedToolPath(u);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
