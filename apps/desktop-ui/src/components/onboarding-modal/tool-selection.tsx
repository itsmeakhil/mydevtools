"use client"

import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  IconRocket,
  IconShield,
  IconBraces,
  IconArrowsExchange,
  IconWand,
  IconNetwork,
  IconServer,
  IconPalette,
  IconDeviceGamepad2,
  IconCheck,
  IconChevronDown as IconChevron,
} from "@tabler/icons-react"
import { sidebarData } from "@/components/sidebar/data/sidebar-data"
import type { NavLink, NavCollapsible } from "@/components/sidebar/types"

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Productivity: IconRocket,
  Security: IconShield,
  Formatters: IconBraces,
  Converters: IconArrowsExchange,
  Generators: IconWand,
  "Network & API": IconNetwork,
  Database: IconServer,
  "Media & Design": IconPalette,
  "Break Room": IconDeviceGamepad2,
}

const CATEGORY_COLORS: Record<string, string> = {
  Productivity: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  Security: "from-green-500/20 to-green-600/10 border-green-500/30",
  Formatters: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  Converters: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  Generators: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  "Network & API": "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  Database: "from-red-500/20 to-red-600/10 border-red-500/30",
  "Media & Design": "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  "Break Room": "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
}

const CATEGORY_ICON_COLORS: Record<string, string> = {
  Productivity: "text-violet-400",
  Security: "text-green-400",
  Formatters: "text-blue-400",
  Converters: "text-cyan-400",
  Generators: "text-amber-400",
  "Network & API": "text-orange-400",
  Database: "text-red-400",
  "Media & Design": "text-pink-400",
  "Break Room": "text-emerald-400",
}

/** Flip this to switch between selection UIs without touching anything else. */
const TOOL_SELECTION_MODE: "tags" | "checkboxes" = "tags"

interface ToolEntry {
  title: string
  url: string
  icon?: React.ElementType
}

interface Category {
  title: string
  tools: ToolEntry[]
}

export function buildCategories(): Category[] {
  return sidebarData.navGroups.map((g) => ({
    title: g.title,
    tools: g.items.flatMap((item) => {
      if (!("items" in item)) {
        const link = item as NavLink
        return [{ title: link.title, url: String(link.url), icon: link.icon }]
      }
      return (item as NavCollapsible).items.map((s) => ({
        title: s.title,
        url: String(s.url),
        icon: s.icon,
      }))
    }),
  }))
}

export interface SelectionProps {
  selectedUrls: Set<string>
  onToggleTool: (url: string) => void
  onToggleCategory: (urls: string[], selected: boolean) => void
}

function TagsToolSelection({ selectedUrls, onToggleTool, onToggleCategory }: SelectionProps) {
  const categories = useMemo(() => buildCategories(), [])
  const allUrls = useMemo(() => categories.flatMap((c) => c.tools.map((t) => t.url)), [categories])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-2xl font-bold tracking-tight">Pick your tools</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Tap any tool to toggle it. Change anytime in Settings.
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 pb-2">
        <div className="flex flex-col gap-5 pb-2">
          {categories.map((cat) => {
            const urls = cat.tools.map((t) => t.url)
            const selectedCount = urls.filter((u) => selectedUrls.has(u)).length
            const allSelected = selectedCount === urls.length
            const Icon = CATEGORY_ICONS[cat.title] ?? IconWand
            const iconColor = CATEGORY_ICON_COLORS[cat.title] ?? "text-primary"

            return (
              <div key={cat.title}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", iconColor)} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {cat.title}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                  <button
                    onClick={() => onToggleCategory(urls, !allSelected)}
                    className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cat.tools.map((tool) => {
                    const selected = selectedUrls.has(tool.url)
                    const ToolIcon = tool.icon
                    return (
                      <motion.button
                        key={tool.url}
                        onClick={() => onToggleTool(tool.url)}
                        whileTap={{ scale: 0.94 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-150",
                          selected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                            : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-muted/70"
                        )}
                      >
                        {ToolIcon && <ToolIcon className="w-3 h-3 flex-shrink-0" />}
                        {tool.title}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedUrls.size}</span> tools enabled
        </p>
        <div className="flex gap-2">
          <button onClick={() => onToggleCategory(allUrls, true)} className="text-xs text-primary hover:underline">
            Select all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button onClick={() => onToggleCategory([], false)} className="text-xs text-muted-foreground hover:underline">
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckboxCategoryRow({
  cat,
  selectedUrls,
  onToggleTool,
  onToggleCategory,
}: SelectionProps & { cat: Category }) {
  const [expanded, setExpanded] = useState(false)
  const urls = cat.tools.map((t) => t.url)
  const selectedCount = urls.filter((u) => selectedUrls.has(u)).length
  const allSelected = selectedCount === urls.length
  const someSelected = selectedCount > 0 && selectedCount < urls.length
  const Icon = CATEGORY_ICONS[cat.title] ?? IconWand
  const iconColor = CATEGORY_ICON_COLORS[cat.title] ?? "text-primary"
  const color = CATEGORY_COLORS[cat.title] ?? "from-primary/20 to-primary/10 border-primary/30"

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br transition-all duration-200 overflow-hidden",
        allSelected
          ? cn("border-primary/40 ring-1 ring-primary/20", color)
          : someSelected
          ? cn("border-primary/20", color)
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCategory(urls, !allSelected) }}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            allSelected ? "bg-primary border-primary" : someSelected ? "bg-primary/30 border-primary/60" : "border-border hover:border-primary/50"
          )}
        >
          {allSelected && <IconCheck className="w-3 h-3 text-primary-foreground" />}
          {someSelected && <div className="w-2 h-0.5 bg-primary rounded" />}
        </button>

        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <div className={cn("flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", allSelected || someSelected ? "bg-primary/15" : "bg-muted")}>
            <Icon className={cn("w-4 h-4", allSelected || someSelected ? iconColor : "text-muted-foreground")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm leading-none", allSelected ? "text-foreground" : someSelected ? "text-foreground/80" : "text-muted-foreground")}>
              {cat.title}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{selectedCount}/{urls.length} selected</p>
          </div>
          <IconChevron className={cn("w-4 h-4 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/40"
          >
            <div className="px-3 py-2 flex flex-col gap-0.5">
              {cat.tools.map((tool) => {
                const ToolIcon = tool.icon
                const checked = selectedUrls.has(tool.url)
                return (
                  <button
                    key={tool.url}
                    onClick={() => onToggleTool(tool.url)}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors group",
                      checked ? "hover:bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    <div className={cn("flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors", checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/40")}>
                      {checked && <IconCheck className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    {ToolIcon && <ToolIcon className={cn("w-3.5 h-3.5 flex-shrink-0", checked ? "text-primary/70" : "text-muted-foreground/60")} />}
                    <span className={cn("text-xs font-medium truncate", checked ? "text-foreground" : "text-muted-foreground")}>{tool.title}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CheckboxesToolSelection({ selectedUrls, onToggleTool, onToggleCategory }: SelectionProps) {
  const categories = useMemo(() => buildCategories(), [])
  const allUrls = useMemo(() => categories.flatMap((c) => c.tools.map((t) => t.url)), [categories])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-2xl font-bold tracking-tight">Pick your tools</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Toggle categories or expand to select individual tools. Change anytime in Settings.
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 pb-4">
        <div className="flex flex-col gap-2 pb-2">
          {categories.map((cat) => (
            <CheckboxCategoryRow
              key={cat.title}
              cat={cat}
              selectedUrls={selectedUrls}
              onToggleTool={onToggleTool}
              onToggleCategory={onToggleCategory}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedUrls.size}</span> tools enabled
        </p>
        <div className="flex gap-2">
          <button onClick={() => onToggleCategory(allUrls, true)} className="text-xs text-primary hover:underline">Select all</button>
          <span className="text-muted-foreground/40">·</span>
          <button onClick={() => onToggleCategory([], false)} className="text-xs text-muted-foreground hover:underline">Clear</button>
        </div>
      </div>
    </div>
  )
}

export function ToolSelectionStep(props: SelectionProps) {
  if (TOOL_SELECTION_MODE === "checkboxes") return <CheckboxesToolSelection {...props} />
  return <TagsToolSelection {...props} />
}
