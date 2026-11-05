"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconX } from "@tabler/icons-react"
import "@xterm/xterm/css/xterm.css"
import type { Terminal as XTerm } from "@xterm/xterm"
import { terminalExists, useTerminalStore } from "@/store/terminal-store"
import type { TermStatus } from "@/lib/terminal/status"
import { decodeOutput, encodeInput, keyedChain, writeQueue } from "@/lib/terminal/util"
import { terminalAttach, terminalKill, terminalResize, terminalSpawn, terminalWrite } from "@/lib/desktop/terminal-bridge"
import { openExternal } from "@/lib/desktop/external-links"
import { cn } from "@/lib/utils"
import { StatusDot } from "./terminal-sidebar"

const FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace'
// Spawn is idempotent and reports the fallback on every call — warn once per session.
const warnedFallback = new Set<string>()
// Attaches for one id reach Rust in mount order, so a fast remount's attach can't be
// overtaken by the disposed mount's (Rust keeps whichever channel attached last).
const attachChain = keyedChain<string>()

/** Resolve a design token to an rgb() string in the scope of `host` (glass materials re-scope some tokens). */
function token(host: HTMLElement, name: string, alpha = 1) {
  const probe = document.createElement("span")
  probe.style.color = `hsl(var(${name}) / ${alpha})`
  host.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c
}

const themeFor = (host: HTMLElement) => ({
  background: token(host, "--card"),
  foreground: token(host, "--foreground"),
  cursor: token(host, "--primary"),
  cursorAccent: token(host, "--card"),
  selectionBackground: token(host, "--primary", 0.3),
})

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

interface Props {
  id: string
  cwd: string
  projectName: string
  label: string
  status: TermStatus | undefined
  focused: boolean
  /** Tool tab active and this pane's tab on screen. */
  visible: boolean
}

function TerminalPaneImpl({ id, cwd, projectName, label, status, focused, visible }: Props) {
  const t = useTranslations("Terminal")
  const hostRef = React.useRef<HTMLDivElement>(null)
  const termRef = React.useRef<XTerm | null>(null)
  const wantFocus = React.useRef(false)
  const strings = React.useRef<{ exited: string; folderMissing: (path: string) => string }>({ exited: "", folderMissing: () => "" })
  React.useEffect(() => {
    strings.current = { exited: t("processExited"), folderMissing: (path) => t("folderMissing", { path }) }
  }, [t])

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ])
      if (disposed) return
      const openLink = (_e: MouseEvent, uri: string) =>
        void openExternal(uri).catch((err) => toast.error(errMsg(err)))
      const term = new Terminal({
        // OSC 8 hyperlinks (ls --hyperlink, gh, etc.); xterm's default shows a confirm() + window.open.
        linkHandler: { activate: openLink, allowNonHttpProtocols: false },
        fontFamily: FONT,
        fontSize: 13,
        cursorBlink: true,
        scrollback: 10000,
        // Keeps the default ANSI palette legible on the light theme's white pane.
        minimumContrastRatio: 4.5,
        theme: themeFor(host),
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.loadAddon(new WebLinksAddon(openLink)) // plain URLs in output
      termRef.current = term
      // xterm measures the font on open(); opening inside a display:none tab measures 0
      // and breaks fit, so open on first show. Writes before that are buffered.
      let opened = false
      const shown = () => host.offsetWidth > 0 && host.offsetHeight > 0
      const layout = () => {
        if (!shown()) return
        if (!opened) {
          term.open(host)
          opened = true
          if (wantFocus.current) term.focus()
        }
        fit.fit()
      }
      layout()

      // Writes are serialized per pane (see writeQueue); a failure is toasted once.
      const write = writeQueue((d) => terminalWrite(id, encodeInput(d)), (e) => {
        if (!disposed) toast.error(errMsg(e))
      })
      // Resize failures mean the session is gone (closed/killed); nothing useful to tell the user.
      const subs = [
        term.onData(write),
        term.onResize(({ cols, rows }) => void terminalResize(id, cols, rows).catch(() => {})),
        term.onTitleChange((title) => useTerminalStore.getState().setTitle(id, title)),
      ]

      let frame = 0
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(layout)
      })
      ro.observe(host)

      // Re-theme when the app theme or accent changes (class/style on <html>).
      const mo = new MutationObserver(() => (term.options.theme = themeFor(host)))
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })

      cleanup = () => {
        cancelAnimationFrame(frame)
        ro.disconnect()
        mo.disconnect()
        subs.forEach((s) => s.dispose())
        termRef.current = null
        term.dispose()
      }

      try {
        const res = await terminalSpawn({ id, cwd, cols: term.cols, rows: term.rows, projectName })
        if (disposed) {
          // Closed mid-spawn: its kill may have reached Rust first, leaving this spawn an orphan PTY.
          // (A remount keeps the id in the store, so its session is left alone.)
          if (!terminalExists(id)) terminalKill(id).catch(() => {})
          return
        }
        if (res.cwdFallback && !warnedFallback.has(id)) {
          warnedFallback.add(id)
          toast.warning(strings.current.folderMissing(cwd))
        }
        // The first message is the scrollback replay, so a remount shows prior output.
        await attachChain(id, async () => {
          if (disposed) return // superseded before its turn: don't attach a dead pane
          await terminalAttach(id, (m) => {
            if (disposed) return
            if (m.type === "data") term.write(decodeOutput(m.b64))
            else term.write(`\r\n\x1b[2m[${strings.current.exited}]\x1b[0m\r\n`)
          })
        })
        // An existing session may have been sized by a previous mount.
        if (!disposed) await terminalResize(id, term.cols, term.rows)
      } catch (e) {
        if (!disposed) toast.error(errMsg(e))
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [id, cwd, projectName])

  React.useEffect(() => {
    wantFocus.current = focused && visible
    if (wantFocus.current) termRef.current?.focus()
  }, [focused, visible])

  const onFocus = () => {
    if (useTerminalStore.getState().focusedTerminalId !== id) useTerminalStore.getState().focusTerminal(id)
  }

  const waiting = status === "waiting"
  return (
    <div
      onFocus={onFocus}
      onMouseDown={onFocus}
      className={cn("flex h-full min-h-0 flex-col bg-card", waiting && "outline outline-2 -outline-offset-2 outline-destructive")}
    >
      <div className="group/pane flex h-6 shrink-0 items-center gap-1.5 px-2.5 text-[12px] text-muted-foreground">
        {status && status !== "idle" && <StatusDot status={status} />}
        <span className={cn("min-w-0 truncate", focused && "text-foreground")}>
          {label}
          {waiting && ` · ${t("statusWaiting")}`}
        </span>
        <button
          type="button"
          onClick={() => useTerminalStore.getState().closeTerminal(id)}
          aria-label={t("closePane")}
          title={t("closePane")}
          className="ml-auto rounded p-0.5 opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-hover/pane:opacity-100"
        >
          <IconX className="h-3 w-3" aria-hidden />
        </button>
      </div>
      {/* Padding lives on the wrapper: FitAddon sizes cols/rows from the host's own box. */}
      <div className="flex min-h-0 flex-1 flex-col pl-2.5 pt-0.5">
        <div ref={hostRef} className="min-h-0 flex-1" />
      </div>
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneImpl)
