"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useConfirm } from "@/components/confirm-dialog"
import { isDesktop } from "@/lib/desktop/is-desktop"
import {
  appQuitCancelled,
  appQuitConfirmed,
  onQuitRequested,
  onTerminalFocus,
  onTerminalStatus,
  terminalSetStrings,
  terminalStatuses,
} from "@/lib/desktop/terminal-bridge"
import { useTabStore } from "@/store/tab-store"
import { useTerminalStore } from "@/store/terminal-store"

const S = () => useTerminalStore.getState()
const TERMINAL_PATH = "/app/terminal"
const QUIT_FLUSH_MAX_MS = 1500
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Wires Rust terminal events into the store, app-wide. `setStatus` drops ids
 * that aren't in a loaded project, so Rust's status snapshot is replayed every
 * time the store becomes loaded. Returns the unsubscribe.
 */
export function subscribeTerminalAttention(onFocus: (id: string) => void, onQuit: (count: number) => void) {
  let disposed = false
  const offs: (() => void)[] = []
  const keep = (p: Promise<() => void>) =>
    p.then((off) => (disposed ? off() : void offs.push(off)), () => {})

  keep(onTerminalStatus(({ id, status }) => S().setStatus(id, status)))
  keep(onTerminalFocus(({ id }) => onFocus(id)))
  keep(onQuitRequested(({ count }) => {
    // Start saving now so an edit made just before ⌘Q lands while the dialog is up.
    void S().flushNow()
    onQuit(count)
  }))

  // ponytail: an event landing between Rust's snapshot and its replay can be overwritten; the next event corrects it.
  const replay = () =>
    terminalStatuses().then(
      (st) => {
        if (!disposed) for (const [id, s] of Object.entries(st)) S().setStatus(id, s)
      },
      () => {},
    )
  offs.push(useTerminalStore.subscribe((s, prev) => void (s.loaded && !prev.loaded && replay())))
  if (S().loaded) void replay()
  else void S().load()

  return () => {
    disposed = true
    offs.forEach((off) => off())
  }
}

/**
 * Confirm: give the pending save up to 1.5 s, then quit. If the save finished
 * but failed (still dirty), stay open so the edit isn't lost — the store's
 * save-failure toast is showing; a second ⌘Q force-quits in Rust. A hung save
 * doesn't block quitting past the bound. Cancel: clear Rust's pending flag.
 */
export async function finishQuit(ok: boolean) {
  try {
    if (ok) {
      const settled = await Promise.race([
        S().flushNow().then(() => true),
        new Promise<false>((r) => setTimeout(r, QUIT_FLUSH_MAX_MS, false)),
      ])
      if (settled && S().dirty) await appQuitCancelled()
      else await appQuitConfirmed()
    } else {
      await appQuitCancelled()
    }
  } catch (e) {
    toast.error(errMsg(e))
  }
}

/** Mount once in the app shell. Returns the quit-confirm dialog to render. */
export function useTerminalStatusListener() {
  const t = useTranslations("Terminal")
  const router = useRouter()
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (!isDesktop()) return
    terminalSetStrings(t("waitingBody"), t("quitTitle", { count: 2 })).catch(() => {})
  }, [t])

  useEffect(() => {
    if (!isDesktop()) return
    return subscribeTerminalAttention(
      (id) => {
        S().focusTerminal(id)
        useTabStore.getState().openTab(TERMINAL_PATH)
        router.push(TERMINAL_PATH)
      },
      (count) =>
        void confirm({
          title: t("quitTitle", { count }),
          description: t("quitBody"),
          confirmLabel: t("quitConfirm"),
          cancelLabel: t("cancel"),
          destructive: true,
        }).then(finishQuit),
    )
  }, [router, confirm, t])

  return dialog
}
