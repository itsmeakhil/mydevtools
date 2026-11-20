"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { leafIds } from "@/lib/terminal/layout"
import { newlyNeedingYou } from "@/lib/terminal/status"
import { useTerminalStore } from "@/store/terminal-store"
import { terminalLabel } from "./terminal-sidebar"

/** Screen-reader announcement when a pane starts needing you (the dots and outlines are visual only). */
export function TerminalAnnouncer() {
  const t = useTranslations("Terminal")
  const [text, setText] = React.useState("")
  React.useEffect(
    () =>
      useTerminalStore.subscribe((s, prev) => {
        if (s.statuses === prev.statuses) return
        const id = newlyNeedingYou(prev.statuses, s.statuses)[0]
        if (!id) return
        for (const p of s.projects)
          for (const tab of p.tabs)
            if (leafIds(tab.layout).includes(id)) {
              const status = s.statuses[id] === "waiting" ? t("statusWaiting") : t("statusDone")
              return setText(`${p.name} / ${terminalLabel(tab, id, s.titles)}: ${status}`)
            }
      }),
    [t],
  )
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {text}
    </div>
  )
}
