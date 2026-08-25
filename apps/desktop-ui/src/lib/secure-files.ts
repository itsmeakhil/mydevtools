/**
 * Secure Files — pure helpers (no I/O). Logical folders are just the `dir`
 * prefix carried in each file's encrypted metadata; the tree is derived.
 */

export type SecureFileEntry = {
  id: string
  name: string
  /** Logical folder, `"a/b"` or `""` for root. */
  dir: string
  size: number
  mtime: number
  importedAt: number
}

export type FolderNode = {
  name: string
  /** Full logical path, `""` for root. */
  path: string
  children: FolderNode[]
  files: SecureFileEntry[]
}

export function joinDir(base: string, name: string): string {
  return base ? `${base}/${name}` : name
}

export function parentDir(dir: string): string {
  const i = dir.lastIndexOf("/")
  return i === -1 ? "" : dir.slice(0, i)
}

export function baseName(dir: string): string {
  return dir.slice(dir.lastIndexOf("/") + 1)
}

/**
 * `currentDir` value meaning "the overview is showing, no folder is selected".
 * `""` is the root folder and would highlight it (folder-tree.tsx:70), so the
 * sentinel has to be a string no path can equal. Written as an escape, not a
 * raw byte — a literal NUL in the source makes the whole file binary to grep,
 * ripgrep and diff, which then skip it silently.
 */
export const NO_FOLDER = "\u0000"

/** Build the folder tree from file dirs plus any empty (not yet populated) dirs. */
export function buildFolderTree(files: SecureFileEntry[], extraDirs: Iterable<string> = []): FolderNode {
  const root: FolderNode = { name: "", path: "", children: [], files: [] }
  const byPath = new Map<string, FolderNode>([["", root]])

  const ensure = (dir: string): FolderNode => {
    const hit = byPath.get(dir)
    if (hit) return hit
    const parent = ensure(parentDir(dir))
    const node: FolderNode = { name: baseName(dir), path: dir, children: [], files: [] }
    parent.children.push(node)
    byPath.set(dir, node)
    return node
  }

  for (const dir of extraDirs) if (dir) ensure(dir)
  for (const f of files) ensure(f.dir).files.push(f)

  const sortNode = (n: FolderNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name))
    n.files.sort((a, b) => a.name.localeCompare(b.name))
    n.children.forEach(sortNode)
  }
  sortNode(root)
  return root
}

export type TypeStat = { type: string; count: number; size: number }

/**
 * Per-type counts and sizes, biggest group first. `classify` is injected so
 * this stays free of component imports (callers pass `getFileType`).
 */
export function fileTypeStats(files: SecureFileEntry[], classify: (name: string) => string): TypeStat[] {
  const acc = new Map<string, TypeStat>()
  for (const f of files) {
    const type = classify(f.name)
    const hit = acc.get(type)
    if (hit) {
      hit.count += 1
      hit.size += f.size
    } else {
      acc.set(type, { type, count: 1, size: f.size })
    }
  }
  return [...acc.values()].sort((a, b) => b.count - a.count || b.size - a.size || a.type.localeCompare(b.type))
}

/** Every folder in the tree, root excluded. */
export function countFolders(node: FolderNode): number {
  return node.children.reduce((n, c) => n + 1 + countFolders(c), 0)
}

/** Blob MIME for a decrypted payload, derived from the name (never stored). */
export function blobMime(fileType: string, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (fileType === "pdf") return "application/pdf"
  if (fileType === "image") return ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`
  if (fileType === "video") return `video/${ext}`
  if (fileType === "audio") return `audio/${ext}`
  return "application/octet-stream"
}

/** Visible `[start, end)` row range for a fixed-row-height virtual list. */
export function visibleRange(
  scrollTop: number,
  viewportH: number,
  rowH: number,
  total: number,
  overscan = 6,
): [number, number] {
  if (total === 0 || rowH <= 0) return [0, 0]
  const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan)
  const end = Math.min(total, Math.ceil((scrollTop + viewportH) / rowH) + overscan)
  return [start, end]
}

/** Sniff text vs binary so `.env`, `.pem`, extension-less files preview as text. */
export function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 8192)
  if (sample.length === 0) return true
  if (sample.includes(0)) return false
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample)
    return true
  } catch {
    return false
  }
}
