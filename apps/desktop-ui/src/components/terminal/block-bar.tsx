"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { IconCheck, IconCopy, IconPlayerPlay, IconTerminal2, IconX } from "@tabler/icons-react"
import { duration } from "@/lib/terminal/util"
import { cn } from "@/lib/utils"

export interface BlockBarProps {
  /** px from the top of the pane's terminal area. */
  top: number
  exit?: number
  ms?: number
  canCopyCommand: boolean
  canCopyOutput: boolean
  /** null = re-run allowed; otherwise why it isn't. */
  rerunBlocked: string | null
  onCopyCommand: () => void
  onCopyOutput: () => void
  onRerun: () => void
}

/** Hover toolbar for one command block: how it ended, and what you can do with it. */
export function BlockBar({ top, exit, ms, canCopyCommand, canCopyOutput, rerunBlocked, onCopyCommand, onCopyOutput, onRerun }: BlockBarProps) {
  const t = useTranslations("Terminal")
  const locale = useLocale()
  const failed = exit !== undefined && exit !== 0
  const btn = "rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
  return (
    <div
      // Keep the pointer over the bar from re-targeting the rows underneath it.
      onMouseDown={(e) => e.preventDefault()}
      style={{ top }}
      className="absolute right-3 z-10 flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 text-[11px] text-muted-foreground"
    >
      {exit !== undefined && (
        <span className={cn("flex items-center gap-1 px-1.5 tabular-nums", failed ? "text-destructive" : "text-foreground")}>
          {failed ? <IconX className="h-3 w-3" aria-hidden /> : <IconCheck className="h-3 w-3" aria-hidden />}
          {failed ? t("blockExit", { code: exit }) : t("blockOk")}
          {ms !== undefined && ms >= 1000 && <span className="text-muted-foreground">· {duration(ms, locale)}</span>}
        </span>
      )}
      <button type="button" className={btn} disabled={!canCopyCommand} onClick={onCopyCommand} aria-label={t("blockCopyCommand")} title={t("blockCopyCommand")}>
        <IconTerminal2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button type="button" className={btn} disabled={!canCopyOutput} onClick={onCopyOutput} aria-label={t("blockCopyOutput")} title={t("blockCopyOutput")}>
        <IconCopy className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        // aria-disabled, not disabled: the tooltip says why it can't run now.
        className={cn(btn, rerunBlocked !== null && "cursor-default opacity-40 hover:bg-transparent hover:text-muted-foreground")}
        aria-disabled={rerunBlocked !== null}
        onClick={() => rerunBlocked === null && onRerun()}
        aria-label={t("blockRerun")}
        title={rerunBlocked ?? t("blockRerun")}
      >
        <IconPlayerPlay className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
