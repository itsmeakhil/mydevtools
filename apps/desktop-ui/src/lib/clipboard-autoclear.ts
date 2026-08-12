/** How long a copied secret is allowed to sit on the clipboard. */
export const CLIPBOARD_CLEAR_SECONDS = 30

/**
 * Only one clear can ever be pending. Without this, copying a second password
 * inside the window let the *first* entry's timer fire and wipe the value the
 * user had just copied — the feature silently working against them.
 */
let pending: { timer: ReturnType<typeof setTimeout>; onSuperseded: () => void } | null = null

/**
 * Clearing blindly would also wipe whatever the user copied from somewhere else
 * in the meantime. Read it back first and leave it alone if it is no longer
 * ours; where the platform refuses the read, fall back to clearing, which is
 * the safer of the two failures for a password.
 */
async function clearIfStillOurs(written: string): Promise<void> {
    try {
        if ((await navigator.clipboard.readText()) !== written) return
    } catch {
        // No read permission — clear anyway rather than leave a secret behind.
    }
    await navigator.clipboard.writeText("").catch(() => {})
}

/**
 * Copy `text`, then clear it after {@link CLIPBOARD_CLEAR_SECONDS}. Rejects if
 * the copy itself failed, so the caller can avoid claiming a success that did
 * not happen. `onDone` fires when the clear runs, and also when a later copy
 * supersedes this one — in both cases the caller's "will clear" notice is stale.
 */
export async function copyWithAutoClear(text: string, onDone?: () => void): Promise<void> {
    cancelPendingClear()
    await navigator.clipboard.writeText(text)
    const timer = setTimeout(() => {
        pending = null
        void clearIfStillOurs(text).finally(() => onDone?.())
    }, CLIPBOARD_CLEAR_SECONDS * 1000)
    pending = { timer, onSuperseded: () => onDone?.() }
}

/** Drop the scheduled clear — used when a new copy takes over, and available
 *  for an explicit "clear now" action. */
export function cancelPendingClear(): void {
    if (!pending) return
    clearTimeout(pending.timer)
    const { onSuperseded } = pending
    pending = null
    onSuperseded()
}
