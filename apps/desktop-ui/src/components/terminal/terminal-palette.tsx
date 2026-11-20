"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { leafIds } from "@/lib/terminal/layout"
import { needsAttention } from "@/lib/terminal/status"
import { agentName } from "@/lib/terminal/agents"
import { useTabStore } from "@/store/tab-store"
import { useTerminalStore } from "@/store/terminal-store"
import { AgentTag, StatusDot, terminalLabel } from "./terminal-sidebar"

const TERMINAL_PATH = "/app/terminal"
const rank = (s: string | undefined) => (s === "waiting" ? 0 : s === "done" ? 1 : 2)

/**
 * ⌘K group to jump to any terminal pane from anywhere in the app. With an empty
 * search it lists only the panes that need you; typing searches all of them.
 */
export function TerminalPaletteGroup({ query, onPick, itemClass, chipClass }: {
  query: string; onPick: (run: () => void) => void; itemClass: string; chipClass: string
}) {
  const t = useTranslations("Terminal")
  const router = useRouter()
  const projects = useTerminalStore((s) => s.projects)
  const statuses = useTerminalStore((s) => s.statuses)
  const titles = useTerminalStore((s) => s.titles)
  const agents = useTerminalStore((s) => s.agents)

  const items = React.useMemo(() => {
    const all = projects.flatMap((p) =>
      p.tabs.flatMap((tab) =>
        leafIds(tab.layout).map((id) => ({ id, label: `${p.name} / ${terminalLabel(tab, id, titles)}`, status: statuses[id], agent: agents[id] })),
      ),
    )
    return all
      .filter((it) => query.trim() || needsAttention(it.status))
      .sort((a, b) => rank(a.status) - rank(b.status))
  }, [projects, statuses, titles, agents, query])

  if (items.length === 0) return null
  return (
    <CommandGroup heading={t("palettePanes")}>
      {items.map((it) => (
        <CommandItem
          key={`terminal-${it.id}`}
          value={`terminal-${it.id}`}
          keywords={[it.label.toLowerCase(), [it.label, t("title"), it.agent ? agentName(it.agent) : ""].join(" ").toLowerCase()]}
          onSelect={() =>
            onPick(() => {
              useTerminalStore.getState().focusTerminal(it.id)
              useTabStore.getState().openTab(TERMINAL_PATH)
              router.push(TERMINAL_PATH)
            })
          }
          className={itemClass}
        >
          <span className={chipClass}>
            <StatusDot status={it.status} />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
          <AgentTag agent={it.agent} />
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
