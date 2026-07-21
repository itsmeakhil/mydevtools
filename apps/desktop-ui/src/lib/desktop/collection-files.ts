/**
 * Tauri fs/dialog access for file-backed (git-friendly) API-client collections.
 * Only ever called behind `isDesktop()`; plugins are imported dynamically so web
 * bundles never pull them in (same pattern as bridge.ts).
 */

import type { FileEntry } from "@/lib/api-client/file-store"

const MAX_DEPTH = 10
const MAX_FILE_BYTES = 1024 * 1024

function assertSafeRelPath(relPath: string): void {
    if (relPath.startsWith("/") || relPath.split("/").some((s) => s === ".." || s === "")) {
        throw new Error(`unsafe path: ${relPath}`)
    }
}

/** Recursive fs-scope grant for a collection dir — required before any read/write in it. */
export async function allowCollectionDir(absPath: string): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core")
    await invoke("fs_allow_collection_dir", { path: absPath })
}

/** Native folder picker. Resolves null when the user cancels. */
export async function pickFolder(): Promise<string | null> {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const picked = await open({ directory: true })
    if (typeof picked !== "string") return null
    await allowCollectionDir(picked)
    return picked
}

/** All `*.yaml` files under `root` (skips dotfiles/dirs like `.git`). */
export async function readCollectionFiles(root: string): Promise<FileEntry[]> {
    const fs = await import("@tauri-apps/plugin-fs")
    const entries: FileEntry[] = []
    const walk = async (dirRel: string, depth: number): Promise<void> => {
        if (depth > MAX_DEPTH) return
        const dirAbs = dirRel ? `${root}/${dirRel}` : root
        for (const entry of await fs.readDir(dirAbs)) {
            if (entry.name.startsWith(".")) continue
            const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name
            if (entry.isDirectory) {
                await walk(rel, depth + 1)
            } else if (entry.isFile && entry.name.endsWith(".yaml")) {
                const content = await fs.readTextFile(`${root}/${rel}`)
                if (content.length <= MAX_FILE_BYTES) entries.push({ relPath: rel, content })
            }
        }
    }
    await walk("", 0)
    return entries
}

/** Apply a diff: write changed files (creating dirs), delete vanished ones, prune empty dirs. */
export async function writeCollectionFiles(
    root: string,
    writes: FileEntry[],
    deletes: string[],
): Promise<void> {
    const fs = await import("@tauri-apps/plugin-fs")
    for (const w of writes) {
        assertSafeRelPath(w.relPath)
        const dir = w.relPath.split("/").slice(0, -1).join("/")
        if (dir) await fs.mkdir(`${root}/${dir}`, { recursive: true })
        await fs.writeTextFile(`${root}/${w.relPath}`, w.content)
    }
    const dirsToPrune = new Set<string>()
    for (const relPath of deletes) {
        assertSafeRelPath(relPath)
        try {
            await fs.remove(`${root}/${relPath}`)
        } catch {
            // Already gone (e.g. deleted externally) — the goal state holds.
        }
        for (let segs = relPath.split("/").slice(0, -1); segs.length > 0; segs.pop()) {
            dirsToPrune.add(segs.join("/"))
        }
    }
    // Deepest first; non-recursive remove fails on non-empty dirs, which is the point.
    for (const dir of [...dirsToPrune].sort((a, b) => b.split("/").length - a.split("/").length)) {
        try {
            await fs.remove(`${root}/${dir}`)
        } catch {
            // Not empty (or already gone) — leave it.
        }
    }
}
