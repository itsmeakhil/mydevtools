"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getFileType } from "@/components/s3-drive/file-types"
import { blobMime, type SecureFileEntry } from "@/lib/secure-files"
import { readSecureFile } from "@/lib/secure-files-api"

/** Longest edge of a generated thumbnail, in CSS pixels (x2 for retina). */
const THUMB_PX = 256
/** Don't decrypt huge images just to shrink them. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024
/** Bounded blob pool — oldest off-screen thumbnails are revoked past this. */
const CACHE_MAX = 150
const CONCURRENCY = 3

export function isThumbnailable(f: SecureFileEntry): boolean {
  return getFileType(f.name) === "image" && f.size <= MAX_SOURCE_BYTES
}

/** Cache key includes size+mtime so Replace invalidates the old thumbnail. */
function cacheKey(f: SecureFileEntry): string {
  return `${f.id}:${f.size}:${f.mtime}`
}

/** Decode, downscale, re-encode. SVG skips the canvas — WKWebView can't
 *  `createImageBitmap` it, and vectors are small enough to use as-is. */
async function makeThumb(bytes: ArrayBuffer, name: string): Promise<string> {
  const blob = new Blob([bytes], { type: blobMime("image", name) })
  if (blob.type === "image/svg+xml") return URL.createObjectURL(blob)

  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, THUMB_PX / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bmp.close()
    throw new Error("no 2d context")
  }
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  // Unsupported types fall back to image/png per spec, so this is always fine.
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8))
  if (!out) throw new Error("thumbnail encode failed")
  return URL.createObjectURL(out)
}

/**
 * Google-Drive-style thumbnails for the files currently on screen.
 *
 * Only visible tiles are decrypted, at most `CONCURRENCY` at a time, and each
 * result is downscaled before it is kept — the plaintext original is never
 * held. Every blob URL is revoked on eviction and on unmount (the tool
 * unmounts when the vault locks, so nothing outlives the session).
 */
export function useThumbnails(visible: SecureFileEntry[], enabled: boolean): Map<string, string> {
  const [, bump] = useState(0)
  const cache = useRef(new Map<string, string>()).current
  const failed = useRef(new Set<string>()).current
  const queue = useRef<SecureFileEntry[]>([])
  const active = useRef(0)
  const visibleKeys = useRef(new Set<string>())

  const evict = useCallback(() => {
    for (const key of cache.keys()) {
      if (cache.size <= CACHE_MAX) break
      if (visibleKeys.current.has(key)) continue
      URL.revokeObjectURL(cache.get(key)!)
      cache.delete(key)
    }
  }, [cache])

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length > 0) {
      const f = queue.current.shift()!
      const key = cacheKey(f)
      if (cache.has(key) || failed.has(key)) continue
      active.current++
      void (async () => {
        try {
          cache.set(key, await makeThumb(await readSecureFile(f.id), f.name))
          evict()
          bump((n) => n + 1)
        } catch {
          // Unsupported/corrupt image — fall back to the type icon, don't retry.
          failed.add(key)
        } finally {
          active.current--
          pump()
        }
      })()
    }
  }, [cache, failed, evict])

  const dep = enabled ? visible.map(cacheKey).join(",") : ""
  useEffect(() => {
    visibleKeys.current = new Set(enabled ? visible.map(cacheKey) : [])
    if (!enabled) return
    const wanted = visible.filter((f) => isThumbnailable(f) && !cache.has(cacheKey(f)) && !failed.has(cacheKey(f)))
    // Re-prioritize to what is on screen now; in-flight work still completes.
    queue.current = wanted
    pump()
    // `dep` is the value-identity of `visible` — the array itself is new each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, enabled])

  useEffect(() => {
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url)
      cache.clear()
    }
  }, [cache])

  const out = new Map<string, string>()
  for (const f of visible) {
    const url = cache.get(cacheKey(f))
    if (url) out.set(f.id, url)
  }
  return out
}
