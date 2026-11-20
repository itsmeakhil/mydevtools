"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconArrowsMinimize, IconChevronDown, IconChevronUp, IconPlayerPlay, IconRefresh, IconX } from "@tabler/icons-react"
import { agentName, resumeCommand } from "@/lib/terminal/agents"
import "@xterm/xterm/css/xterm.css"
import type { IMarker, Terminal as XTerm } from "@xterm/xterm"
import type { SearchAddon } from "@xterm/addon-search"
import { terminalExists, useTerminalStore } from "@/store/terminal-store"
import type { TermStatus } from "@/lib/terminal/status"
import {
  cwdFromOsc7, decodeOutput, encodeInput, shellQuote, FONT_SIZE, isForeignEditable, keyedChain, matchPaneShortcut, promptTarget, writeQueue, type PaneShortcut,
} from "@/lib/terminal/util"
import {
  terminalAttach, terminalClearScrollback, terminalKill, terminalResize, terminalSpawn, terminalWrite,
} from "@/lib/desktop/terminal-bridge"
import { openExternal } from "@/lib/desktop/external-links"
import { cn } from "@/lib/utils"
import {
  ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { AgentTag, StatusDot } from "./terminal-sidebar"
import { useCloseGuard } from "./close-guard"

const FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace'
/** The user's font first, the system monospace stack as fallback. Quotes are stripped so the name can't break the list. */
const fontStack = (family: string) => {
  const f = family.replace(/["'\\]/g, "").trim()
  return f ? `"${f}", ${FONT}` : FONT
}
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

// ANSI 16-colour palettes. Programs pick these by index, so they are concrete colours rather than
// design tokens; tuned for the app's neutral card surfaces (minimumContrastRatio still guards legibility).
const ANSI_DARK = {
  black: "#3b3b42", red: "#f07f7f", green: "#8fcf8a", yellow: "#e6c36f", blue: "#79a8f2", magenta: "#c79df0",
  cyan: "#6fcfcf", white: "#c9c9d0", brightBlack: "#71717c", brightRed: "#ff9e9e", brightGreen: "#a9e3a3",
  brightYellow: "#f3d68f", brightBlue: "#9dc1ff", brightMagenta: "#dbbbff", brightCyan: "#92e4e2", brightWhite: "#f3f3f6",
}
const ANSI_LIGHT = {
  black: "#24242a", red: "#c3332e", green: "#2b7d3a", yellow: "#8f6400", blue: "#2c5fc4", magenta: "#963db0",
  cyan: "#17777e", white: "#7a7a84", brightBlack: "#5d5d68", brightRed: "#d6453f", brightGreen: "#33934a",
  brightYellow: "#a87700", brightBlue: "#3a70dc", brightMagenta: "#ab4ec7", brightCyan: "#1f8b94", brightWhite: "#3b3b44",
}

/** Relative luminance of an `rgb()`/`rgba()` string; 1 (light) when it can't be parsed. */
const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["255", "255", "255"]).map(Number)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

const themeFor = (host: HTMLElement) => {
  const background = token(host, "--card")
  return {
    ...(luminance(background) < 0.5 ? ANSI_DARK : ANSI_LIGHT),
    background,
    foreground: token(host, "--foreground"),
    cursor: token(host, "--primary"),
    cursorAccent: background,
    selectionBackground: token(host, "--primary", 0.3),
  }
}

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
  /** The tab holds more than one pane (unfocused ones dim; maximize is offered). */
  split: boolean
}

function TerminalPaneImpl({ id, cwd, projectName, label, status, focused, visible, split }: Props) {
  const t = useTranslations("Terminal")
  const hostRef = React.useRef<HTMLDivElement>(null)
  const termRef = React.useRef<XTerm | null>(null)
  const searchRef = React.useRef<SearchAddon | null>(null)
  const relayout = React.useRef(() => {})
  const onShortcut = React.useRef<(a: PaneShortcut) => void>(() => {})
  const wantFocus = React.useRef(false)
  const fontSize = useTerminalStore((s) => s.fontSize)
  const prefs = useTerminalStore((s) => s.prefs)
  const agent = useTerminalStore((s) => s.agents[id])
  const optionAsMeta = useTerminalStore((s) => s.optionAsMeta)
  const zoomed = useTerminalStore((s) => s.zoomedId === id && s.focusedTerminalId === id)
  const guardClose = useCloseGuard()
  const [exited, setExited] = React.useState(false)
  /** Agent that ran here before the app quit, with the command that picks it up again. */
  const [resume, setResume] = React.useState<{ agent: string; cmd: string } | null>(null)
  const exitedRef = React.useRef(false)
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [hasSelection, setHasSelection] = React.useState(false)
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
      const prefs = useTerminalStore.getState().prefs
      const term = new Terminal({
        // OSC 8 hyperlinks (ls --hyperlink, gh, etc.); xterm's default shows a confirm() + window.open.
        linkHandler: { activate: openLink, allowNonHttpProtocols: false },
        fontFamily: fontStack(prefs.fontFamily),
        fontSize: useTerminalStore.getState().fontSize,
        lineHeight: prefs.lineHeight,
        cursorStyle: prefs.cursorStyle,
        cursorBlink: prefs.cursorBlink,
        scrollback: prefs.scrollback,
        macOptionIsMeta: useTerminalStore.getState().optionAsMeta,
        allowProposedApi: true, // unicode11 version switch
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
      // OSC 7 = the shell's current directory (status bar); the replayed scrollback restores the last one.
      const cwdMarks = term.parser.registerOscHandler(7, (data) => {
        const dir = cwdFromOsc7(data)
        if (dir) useTerminalStore.getState().setCwd(id, dir)
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
        if (!action) {
          // Exited shell: Enter starts a new one; other keys have nowhere to go.
          if (!exitedRef.current) return true
          if (e.type === "keydown" && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey)
            useTerminalStore.getState().restartTerminal(id)
          return e.metaKey // let ⌘ shortcuts (copy, app shortcuts) through
        }
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
        term.onSelectionChange(() => {
          if (useTerminalStore.getState().prefs.copyOnSelect && term.hasSelection())
            navigator.clipboard.writeText(term.getSelection()).catch(() => {}) // best effort, like other terminals
        }),
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
        cwdMarks.dispose()
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
        const cmd = res.resume ? resumeCommand(res.resume) : null
        if (res.resume && cmd) setResume({ agent: res.resume.agent, cmd })
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
            else {
              term.write(`\r\n\x1b[2m[${strings.current.exited}]\x1b[0m\r\n`)
              exitedRef.current = true
              setExited(true)
            }
          })
        })
        // Restarted pane: its exited predecessor stayed alive only so this spawn could open in its directory.
        if (inheritCwdFrom && !terminalExists(inheritCwdFrom)) terminalKill(inheritCwdFrom).catch(() => {})
        // An existing session may have been sized by a previous mount.
        if (!disposed) await terminalResize(id, term.cols, term.rows)
        // Launched from the new-tab menu: type its command (the shell takes it as typeahead).
        const run = disposed ? undefined : useTerminalStore.getState().takeRunOnStart(id)
        if (run) await terminalWrite(id, encodeInput(`${run}\r`))
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
    if (termRef.current) termRef.current.options.macOptionIsMeta = optionAsMeta
  }, [optionAsMeta])

  React.useEffect(() => {
    const term = termRef.current
    if (!term || term.options.fontSize === fontSize) return
    term.options.fontSize = fontSize
    relayout.current()
  }, [fontSize])

  // Settings changed: apply to the live terminal; font metrics need a refit.
  React.useEffect(() => {
    const term = termRef.current
    if (!term) return
    const o = term.options
    const font = fontStack(prefs.fontFamily)
    const refit = o.fontFamily !== font || o.lineHeight !== prefs.lineHeight
    Object.assign(o, {
      fontFamily: font, lineHeight: prefs.lineHeight, cursorStyle: prefs.cursorStyle,
      cursorBlink: prefs.cursorBlink, scrollback: prefs.scrollback,
    })
    if (refit) relayout.current()
  }, [prefs])

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

  const statusLabel = status === "waiting" ? t("statusWaiting") : status === "done" ? t("statusDone") : null
  const store = useTerminalStore.getState
  const close = () => guardClose([id], () => store().closeTerminal(id))
  // Blur ends a rename (saving it); Enter blurs, Escape blurs without saving.
  const discardRename = React.useRef(false)
  const endRename = () => {
    if (!discardRename.current && renaming !== null) store().renameTerminal(id, renaming)
    discardRename.current = false
    setRenaming(null)
    termRef.current?.focus()
  }
  const copy = () => {
    const text = termRef.current?.getSelection()
    if (text) navigator.clipboard.writeText(text).catch((e) => toast.error(errMsg(e)))
  }
  // Native picker → quoted paths typed at the cursor (file drops can't carry paths: dragDropEnabled is off for HTML5 DnD).
  const insertPaths = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const picked = await open({ multiple: true })
      const paths = picked === null ? [] : Array.isArray(picked) ? picked : [picked]
      if (paths.length) termRef.current?.paste(`${shellQuote(paths)} `)
      termRef.current?.focus()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  const paste = () =>
    navigator.clipboard.readText().then((text) => text && termRef.current?.paste(text)).catch((e) => toast.error(errMsg(e)))

  return (
    <div
      data-terminal-id={id}
      onFocus={onFocus}
      onMouseDown={onFocus}
      className={cn(
        "flex h-full min-h-0 flex-col bg-card",
        // Maximized: cover the whole tab (the nearest positioned ancestor; split panels aren't positioned).
        zoomed && "absolute inset-0 z-20",
        status === "waiting" && "outline outline-2 -outline-offset-2 outline-warning",
        status === "done" && "outline outline-1 -outline-offset-1 outline-primary/60",
      )}
    >
      <div className="group/pane flex h-6 shrink-0 items-center gap-1.5 px-2.5 text-[12px] text-muted-foreground">
        {status && status !== "idle" && <StatusDot status={status} />}
        {renaming !== null ? (
          <input
            autoFocus
            value={renaming}
            aria-label={t("renameTerminal")}
            onChange={(e) => setRenaming(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={endRename}
            onKeyDown={(e) => {
              if (e.key === "Escape") discardRename.current = true
              if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur()
            }}
            className="h-5 min-w-0 flex-1 rounded bg-background px-1 text-[12px] text-foreground outline-none ring-1 ring-ring"
          />
        ) : (
          <>
            <AgentTag agent={agent} />
            <span
              className={cn("min-w-0 truncate", focused && "text-foreground")}
              title={label}
              onDoubleClick={() => setRenaming(label)}
            >
              {label}
              {statusLabel && ` · ${statusLabel}`}
            </span>
          </>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {zoomed && (
            <button
              type="button"
              onClick={() => store().toggleZoom(id)}
              aria-label={t("restorePane")}
              title={`${t("restorePane")} (⌘⇧↵)`}
              className="rounded p-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <IconArrowsMinimize className="h-3 w-3" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label={t("closePane")}
            title={t("closePane")}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-hover/pane:opacity-100"
          >
            <IconX className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </div>
      <ContextMenu onOpenChange={(open) => open && setHasSelection(!!termRef.current?.hasSelection())}>
        <ContextMenuTrigger asChild>
      {/* Padding lives on the wrapper: FitAddon sizes cols/rows from the host's own box. */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col pl-2.5 pt-0.5 transition-opacity duration-150",
          // In a split, the panes not receiving keystrokes recede.
          split && !focused && !zoomed && "opacity-60",
        )}
      >
        <div ref={hostRef} className="min-h-0 flex-1" />
        {resume && !exited && (
          <div className="absolute inset-x-2 bottom-2 z-10 flex items-center gap-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[12px] text-muted-foreground">
            <span className="min-w-0 flex-1 truncate" title={resume.cmd}>
              {t("resumeTitle", { agent: agentName(resume.agent) })}
            </span>
            <button
              type="button"
              onClick={() => {
                void terminalWrite(id, encodeInput(`${resume.cmd}\r`)).catch((e) => toast.error(errMsg(e)))
                setResume(null)
                termRef.current?.focus()
              }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-foreground/[0.06]"
            >
              <IconPlayerPlay className="h-3.5 w-3.5" aria-hidden />
              {t("resumeAction")}
            </button>
            <button
              type="button"
              onClick={() => setResume(null)}
              aria-label={t("resumeDismiss")}
              title={t("resumeDismiss")}
              className="rounded p-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <IconX className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
        {exited && (
          <div className="absolute inset-x-2 bottom-2 z-10 flex items-center gap-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[12px] text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">{t("processExited")}</span>
            <button
              type="button"
              onClick={() => store().restartTerminal(id)}
              title={`${t("restart")} (↵)`}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-foreground/[0.06]"
            >
              <IconRefresh className="h-3.5 w-3.5" aria-hidden />
              {t("restart")}
            </button>
            <button
              type="button"
              onClick={() => store().closeTerminal(id)}
              className="rounded px-1.5 py-0.5 hover:bg-foreground/[0.06] hover:text-foreground"
            >
              {t("closePane")}
            </button>
          </div>
        )}
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
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-56"
          onCloseAutoFocus={(e) => {
            e.preventDefault() // back to the shell, not the menu trigger…
            requestAnimationFrame(() => {
              // …unless the menu opened the rename field.
              if (!isForeignEditable(document.activeElement as HTMLElement | null)) termRef.current?.focus()
            })
          }}
        >
          <ContextMenuItem disabled={!hasSelection} onSelect={copy}>
            {t("copy")}<ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={paste}>
            {t("paste")}<ContextMenuShortcut>⌘V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={insertPaths}>{t("insertPath")}</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => store().split(id, "row")}>
            {t("splitRight")}<ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => store().split(id, "col")}>
            {t("splitDown")}<ContextMenuShortcut>⌘⇧D</ContextMenuShortcut>
          </ContextMenuItem>
          {split && (
            <ContextMenuItem onSelect={() => store().toggleZoom(id)}>
              {zoomed ? t("restorePane") : t("maximizePane")}<ContextMenuShortcut>⌘⇧↵</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => onShortcut.current("find")}>
            {t("find")}<ContextMenuShortcut>⌘F</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onShortcut.current("clear")}>
            {t("clear")}<ContextMenuShortcut>⌘K</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setRenaming(label)}>{t("renameTerminal")}</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={optionAsMeta} onCheckedChange={(on) => store().setOptionAsMeta(on === true)}>
            {t("optionAsMeta")}
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={close}>
            {t("closePane")}<ContextMenuShortcut>⌘W</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

export const TerminalPane = React.memo(TerminalPaneImpl)
