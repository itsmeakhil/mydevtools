"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconCheck, IconGitBranch } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { boardColumns, type Card } from "@/lib/terminal/board"
import { terminalClearWaiting, terminalScreenTail, terminalWrite } from "@/lib/desktop/terminal-bridge"
import { ago, encodeInput } from "@/lib/terminal/util"
import type { TermStatus } from "@/lib/terminal/status"
import { useTerminalStore } from "@/store/terminal-store"
import { cn } from "@/lib/utils"
import { AgentTag, StatusDot, terminalLabel } from "./terminal-sidebar"

const S = () => useTerminalStore.getState()
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const COLUMNS = [
  ["blocked", "waiting", "boardBlocked"],
  ["done", "done", "boardDone"],
  ["running", "running", "boardRunning"],
  ["idle", "idle", "boardIdle"],
] as const

/** Last lines of a pane, refreshed every few seconds while its card is on the board. */
function usePreview(id: string, enabled: boolean) {
  const [text, setText] = React.useState("")
  React.useEffect(() => {
    if (!enabled) return
    let live = true
    const load = () => terminalScreenTail(id, 6).then((t) => live && setText(t), () => {})
    void load()
    const h = setInterval(load, 3_000)
    return () => {
      live = false
      clearInterval(h)
    }
  }, [id, enabled])
  return enabled ? text : ""
}

const BoardCard = React.memo(function BoardCard({ card, status, selected, now, onSelect, onOpen, replyRef }: {
  card: Card; status: TermStatus; selected: boolean; now: number
  onSelect: () => void; onOpen: () => void; replyRef: React.RefObject<HTMLInputElement | null> | null
}) {
  const t = useTranslations("Terminal")
  const locale = useLocale()
  const tab = useTerminalStore((s) => s.projects.find((p) => p.id === card.projectId)?.tabs.find((x) => x.id === card.tabId))
  const titles = useTerminalStore((s) => s.titles)
  const agent = useTerminalStore((s) => s.agents[card.id])
  const attention = status === "waiting" || status === "done"
  const preview = usePreview(card.id, attention)
  const [reply, setReply] = React.useState("")
  const label = tab ? terminalLabel(tab, card.id, titles) : card.tabName
  const send = () => {
    if (!reply) return
    terminalWrite(card.id, encodeInput(`${reply}\r`)).then(() => setReply(""), (e) => toast.error(errMsg(e)))
  }

  return (
    <div
      role="listitem"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={cn(
        "rounded-lg border border-border bg-card p-2.5 text-[13px] transition-colors",
        selected && "ring-2 ring-inset ring-primary/60",
      )}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={status === "idle" ? undefined : status} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 truncate text-left font-medium hover:underline">
          {card.projectName} / {label}
        </button>
        <AgentTag agent={agent} />
        {attention && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              terminalClearWaiting(card.id).catch((err) => toast.error(errMsg(err)))
            }}
            aria-label={t("markSeen")}
            title={`${t("markSeen")} (e)`}
            className="rounded p-0.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <IconCheck className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {(card.worktreeBranch || card.since !== undefined) && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {card.worktreeBranch && (
            <span className="flex min-w-0 items-center gap-1">
              <IconGitBranch className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate font-mono">{card.worktreeBranch}</span>
            </span>
          )}
          {card.since !== undefined && <span className="ml-auto shrink-0 tabular-nums">{ago(card.since, now, locale)}</span>}
        </div>
      )}
      {card.message && <p className="mt-1.5 line-clamp-2 text-[12px]">{card.message}</p>}
      {preview && (
        <pre className="mt-1.5 max-h-28 overflow-hidden whitespace-pre-wrap break-all rounded-md bg-background px-2 py-1.5 font-mono text-[11px] leading-snug text-muted-foreground">
          {preview}
        </pre>
      )}
      {attention && (
        <Input
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              send()
            }
            e.stopPropagation() // j/k/r/e are text here
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder={t("quickReply")}
          aria-label={`${t("quickReply")}: ${label}`}
          className="mt-2 h-7 text-[12px]"
        />
      )}
    </div>
  )
})

/** Every pane as a card, grouped for triage: what's blocked on you first, longest wait on top. */
export function AgentBoard() {
  const t = useTranslations("Terminal")
  const projects = useTerminalStore((s) => s.projects)
  const statuses = useTerminalStore((s) => s.statuses)
  const attention = useTerminalStore((s) => s.attention)
  const runningSince = useTerminalStore((s) => s.runningSince)
  const cols = React.useMemo(
    () => boardColumns(projects, statuses, attention, runningSince),
    [projects, statuses, attention, runningSince],
  )
  const order = React.useMemo(() => COLUMNS.flatMap(([k]) => cols[k]), [cols])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = order.find((c) => c.id === selectedId) ?? order[0]
  const replyRef = React.useRef<HTMLInputElement | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    rootRef.current?.focus()
    const h = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(h)
  }, [])

  const open = (id: string) => {
    S().focusTerminal(id)
    if (S().boardOpen) S().toggleBoard()
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !selected) return
    const i = order.indexOf(selected)
    const move = e.key === "j" || e.key === "ArrowDown" ? 1 : e.key === "k" || e.key === "ArrowUp" ? -1 : 0
    if (move) {
      e.preventDefault()
      setSelectedId(order[Math.min(order.length - 1, Math.max(0, i + move))].id)
    } else if (e.key === "Enter") {
      e.preventDefault()
      open(selected.id)
    } else if (e.key === "r") {
      e.preventDefault()
      replyRef.current?.focus()
    } else if (e.key === "e") {
      e.preventDefault()
      terminalClearWaiting(selected.id).catch((err) => toast.error(errMsg(err)))
    }
  }

  if (order.length === 0)
    return <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">{t("boardEmpty")}</div>

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={t("board")}
      className="grid h-full min-h-0 grid-cols-4 gap-3 overflow-hidden bg-background p-3 outline-none"
    >
      {COLUMNS.map(([key, status, title]) => (
        <section key={key} className="flex min-h-0 flex-col">
          <h3 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold text-muted-foreground">
            {t(title)}
            <span className="tabular-nums">{cols[key].length}</span>
          </h3>
          <div role="list" className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
            {cols[key].map((card) => (
              <BoardCard
                key={card.id}
                card={card}
                status={status}
                selected={card.id === selected?.id}
                now={now}
                onSelect={() => setSelectedId(card.id)}
                onOpen={() => open(card.id)}
                replyRef={card.id === selected?.id ? replyRef : null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
