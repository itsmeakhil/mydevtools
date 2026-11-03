import { isDesktop } from "./is-desktop"

type TextItem = { types: readonly string[]; getType(type: string): Promise<Blob> }

/**
 * Monaco's WebKit clipboard workaround calls `navigator.clipboard.write()` on every click/keydown
 * with a ClipboardItem whose text is a promise it settles later (resolved on copy, cancelled on the
 * next interaction). Tauri's WKWebView rejects that write immediately with NotAllowedError, so Monaco
 * logs a console error per interaction and its context-menu Copy silently does nothing.
 *
 * Route a single plain-text item to `writeText` once its text resolves; if the text is cancelled,
 * reject with NotAllowedError, which Monaco treats as the expected "cancelled" outcome and does not
 * log. Returns null for any other payload so the real `write()` handles it.
 */
export function routeTextWrite(items: readonly TextItem[], writeText: (text: string) => Promise<void>): Promise<void> | null {
  if (items.length !== 1 || items[0].types.length !== 1 || items[0].types[0] !== "text/plain") return null
  return items[0].getType("text/plain").then(
    (blob) => blob.text().then(writeText),
    () => Promise.reject(new DOMException("Clipboard write cancelled", "NotAllowedError")),
  )
}

/** Desktop only: install the routing in front of `navigator.clipboard.write`. Idempotent. */
export function installClipboardWriteShim() {
  if (!isDesktop()) return
  const cb = navigator.clipboard as Clipboard & { __mdtWriteShim?: true }
  if (!cb?.write || cb.__mdtWriteShim) return
  const realWrite = cb.write.bind(cb)
  cb.write = (items) => routeTextWrite(items, (t) => cb.writeText(t)) ?? realWrite(items)
  cb.__mdtWriteShim = true
}
