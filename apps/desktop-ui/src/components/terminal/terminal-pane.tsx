"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react"
import "@xterm/xterm/css/xterm.css"
import type { IMarker, Terminal as XTerm } from "@xterm/xterm"
import type { SearchAddon } from "@xterm/addon-search"
import { terminalExists, useTerminalStore } from "@/store/terminal-store"
import type { TermStatus } from "@/lib/terminal/status"
import {
  decodeOutput, encodeInput, FONT_SIZE, keyedChain, matchPaneShortcut, promptTarget, writeQueue, type PaneShortcut,
} from "@/lib/terminal/util"
import {
  terminalAttach, terminalClearScrollback, terminalKill, terminalResize, terminalSpawn, terminalWrite,
} from "@/lib/desktop/terminal-bridge"
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
  const searchRef = React.useRef<SearchAddon | null>(null)
  const relayout = React.useRef(() => {})
  const onShortcut = React.useRef<(a: PaneShortcut) => void>(() => {})
  const wantFocus = React.useRef(false)
  const fontSize = useTerminalStore((s) => s.fontSize)
  const [findOpen, setFindOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [noMatch, setNoMatch] = React.useState(false)
  const findInput = React.useRef<HTMLInputElement>(null)
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
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }, { SearchAddon }, { Unicode11Addon }, { WebglAddon }] =
        await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/addon-web-links"),
          import("@xterm/addon-search"),
          import("@xterm/addon-unicode11"),
          import("@xterm/addon-webgl"),
        ])
      if (disposed) return
      const openLink = (_e: MouseEvent, uri: string) =>
        void openExternal(uri).catch((err) => toast.error(errMsg(err)))
      const term = new Terminal({
        // OSC 8 hyperlinks (ls --hyperlink, gh, etc.); xterm's default shows a confirm() + window.open.
        linkHandler: { activate: openLink, allowNonHttpProtocols: false },
        fontFamily: FONT,
        fontSize: useTerminalStore.getState().fontSize,
        allowProposedApi: true, // unicode11 version switch
        cursorBlink: true,
        scrollback: 10000,
        // Keeps the default ANSI palette legible on the light theme's white pane.
        minimumContrastRatio: 4.5,
        theme: themeFor(host),
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.loadAddon(new WebLinksAddon(openLink)) // plain URLs in output
      const search = new SearchAddon()
      term.loadAddon(search)
      searchRef.current = search
      // Emoji and CJK take two cells, as in agent TUIs' own width tables.
      term.loadAddon(new Unicode11Addon())
      term.unicode.activeVersion = "11"
      termRef.current = term

      // OSC 133 A = a prompt starts here (written by our zsh/bash integration, fish, nushell…).
      let marks: IMarker[] = []
      const prompts = term.parser.registerOscHandler(133, (data) => {
        if (data.startsWith("A")) {
          const m = term.registerMarker(0)
          if (m) marks.push(m)
          if (marks.length > 500) marks = marks.filter((x) => !x.isDisposed)
        }
        return false
      })
      onShortcut.current = (action) => {
        switch (action) {
          case "find":
            setFindOpen(true)
            requestAnimationFrame(() => findInput.current?.select())
            return
          case "clear":
            term.clear()
            void terminalClearScrollback(id).catch(() => {})
            return
          case "zoomIn":
          case "zoomOut":
          case "zoomReset": {
            const st = useTerminalStore.getState()
            st.setFontSize(action === "zoomReset" ? FONT_SIZE.default : st.fontSize + (action === "zoomIn" ? 1 : -1))
            return
          }
          case "prevPrompt":
          case "nextPrompt": {
            const top = term.buffer.active.viewportY
            const line = promptTarget(marks.filter((m) => !m.isDisposed).map((m) => m.line), top, action === "prevPrompt" ? "prev" : "next")
            if (line !== null) term.scrollToLine(line)
            else if (action === "nextPrompt") term.scrollToBottom()
          }
        }
      }
      // Returning false keeps xterm from also sending the key to the shell.
      term.attachCustomKeyEventHandler((e) => {
        const action = matchPaneShortcut(e)
        if (!action) return true
        // Held ⌘+ / ⌘− keep zooming; other shortcuts fire once per press.
        if (e.type === "keydown" && (!e.repeat || action.startsWith("zoom"))) onShortcut.current(action)
        e.preventDefault()
        return false
      })
      // xterm measures the font on open(); opening inside a display:none tab measures 0
      // and breaks fit, so open on first show. Writes before that are buffered.
      let opened = false
      const shown = () => host.offsetWidth > 0 && host.offsetHeight > 0
      const layout = () => {
        if (!shown()) return
        if (!opened) {
          term.open(host)
          opened = true
          // GPU renderer; on failure or a lost context the DOM renderer takes over.
          try {
            const gl = new WebglAddon()
            gl.onContextLoss(() => gl.dispose())
            term.loadAddon(gl)
          } catch {
            // no WebGL2 here: keep the DOM renderer
          }
          if (wantFocus.current) term.focus()
        }
        fit.fit()
      }
      relayout.current = layout
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
        prompts.dispose()
        relayout.current = () => {}
        onShortcut.current = () => {}
        searchRef.current = null
        termRef.current = null
        term.dispose()
      }

      try {
        const inheritCwdFrom = useTerminalStore.getState().cwdFrom[id]
        const res = await terminalSpawn({ id, cwd, cols: term.cols, rows: term.rows, projectName, inheritCwdFrom })
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
    const term = termRef.current
    if (!term || term.options.fontSize === fontSize) return
    term.options.fontSize = fontSize
    relayout.current()
  }, [fontSize])

  const find = (dir: "next" | "prev", incremental = false) => {
    const s = searchRef.current
    if (!s || !query) return setNoMatch(false)
    const found = dir === "next" ? s.findNext(query, { incremental }) : s.findPrevious(query)
    setNoMatch(!found)
  }
  const closeFind = () => {
    setFindOpen(false)
    setNoMatch(false)
    searchRef.current?.clearDecorations()
    termRef.current?.clearSelection()
    termRef.current?.focus()
  }

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
      <div className="relative flex min-h-0 flex-1 flex-col pl-2.5 pt-0.5">
        <div ref={hostRef} className="min-h-0 flex-1" />
        {findOpen && (
          <div
            role="search"
            className="absolute right-2 top-1 z-10 flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5"
          >
            <input
              ref={findInput}
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value)
                const s = searchRef.current
                if (s && e.target.value) setNoMatch(!s.findNext(e.target.value, { incremental: true }))
                else setNoMatch(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  closeFind()
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  find(e.shiftKey ? "prev" : "next")
                } else if (e.metaKey && e.code === "KeyF") {
                  e.preventDefault()
                  e.currentTarget.select()
                }
              }}
              placeholder={t("find")}
              aria-label={t("find")}
              aria-invalid={noMatch}
              className={cn(
                "h-6 w-44 rounded bg-background px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground",
                noMatch && "text-destructive",
              )}
            />
            {noMatch && <span className="px-1 text-[11px] text-destructive">{t("noMatches")}</span>}
            {([
              ["prev", IconChevronUp, t("findPrevious")],
              ["next", IconChevronDown, t("findNext")],
            ] as const).map(([dir, Icon, label]) => (
              <button
                key={dir}
                type="button"
                onClick={() => find(dir)}
                aria-label={label}
                title={label}
                className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={closeFind}
              aria-label={t("closeFind")}
              title={t("closeFind")}
              className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <IconX className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneImpl)
