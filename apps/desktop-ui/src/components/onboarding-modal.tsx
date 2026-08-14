"use client"

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { usePinnedToolsStore } from "@/store/pinned-tools-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { patchUserPreferences } from "@/lib/user-preferences-api"
import { ONBOARDING_ROLES, type OnboardingRole } from "@/lib/onboarding-roles"
import { Input } from "@/components/ui/input"
import useAuth from "@/utils/useAuth"
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
  IconArrowRight,
  IconLayout,
  IconCommand,
  IconPin,
  IconX,
  IconChevronDown as IconChevron,
} from "@tabler/icons-react"
import { sidebarData } from "@/components/sidebar/data/sidebar-data"
import type { NavLink, NavCollapsible } from "@/components/sidebar/types"
import MdtAurora from "@/components/mdt-aurora"
import { ScrollArea } from "@/components/ui/scroll-area"

// ── Tool category icons by title ──────────────────────────────────────────────

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

// ── Tour slides ───────────────────────────────────────────────────────────────

const TOUR_SLIDES = [
  {
    icon: IconLayout,
    iconColor: "text-violet-400",
    bg: "from-violet-500/10 to-transparent",
    title: "Your workspace, your way",
    description:
      "Every tool lives in the sidebar. Open multiple tools in tabs — they stay open until you close them. Your layout is restored on every visit.",
  },
  {
    icon: IconCommand,
    iconColor: "text-blue-400",
    bg: "from-blue-500/10 to-transparent",
    title: "Command palette",
    description:
      "Press ⌘K (or Ctrl+K) to instantly search and launch any tool, jump to settings, or switch tabs — without touching the mouse.",
  },
  {
    icon: IconPin,
    iconColor: "text-amber-400",
    bg: "from-amber-500/10 to-transparent",
    title: "Pin your favourites",
    description:
      "Right-click any tool in the sidebar to pin it to the top. Pinned tools are synced across all your devices.",
  },
]

// ── Step indicators ───────────────────────────────────────────────────────────

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div
      className={cn(
        "h-2 rounded-full transition-all duration-300",
        done ? "w-6 bg-primary" : active ? "w-6 bg-primary/70" : "w-2 bg-muted-foreground/30"
      )}
    />
  )
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────

const WELCOME_HIGHLIGHTS = [
  { icon: IconBraces, label: "60+ tools" },
  { icon: IconCommand, label: "⌘K to launch" },
  { icon: IconShield, label: "Encrypted sync" },
  { icon: IconLayout, label: "Yours, instantly" },
]

function WelcomeStep() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="mdt-kicker mb-5"
      >
        Welcome aboard
      </motion.p>

      <motion.h2
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
      >
        Your entire dev toolkit,{" "}
        <span className="mdt-grad-text mdt-grad-anim">one tab away.</span>
      </motion.h2>

      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-auto mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground"
      >
        Let&apos;s take 30 seconds to build your workspace and learn the two shortcuts you&apos;ll use
        every day.
      </motion.p>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {WELCOME_HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="glass-overlay flex flex-col items-center gap-2 rounded-xl px-3 py-4"
          >
            <Icon className="mdt-icon-grad h-5 w-5" />
            <span className="text-xs font-medium text-foreground/80">{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ── Step 1: About you (name + role) ───────────────────────────────────────────

function AboutYouStep({
  name,
  onNameChange,
  roleId,
  onRoleChange,
}: {
  name: string
  onNameChange: (v: string) => void
  roleId: string | null
  onRoleChange: (role: OnboardingRole) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-6 pt-6 pb-4 text-center">
        <p className="mdt-kicker mb-2">Step 1 · About you</p>
        <h2 className="text-2xl font-bold tracking-tight">Make it yours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll curate your toolkit around what you do.
        </p>
      </header>

      <ScrollArea className="min-h-0 flex-1 px-6 pb-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 pb-2">
          <div className="space-y-2">
            <label htmlFor="ob-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your name
            </label>
            <Input
              id="ob-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ada Lovelace"
              maxLength={80}
              className="h-11 max-w-sm bg-white/5"
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What describes you best?
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ONBOARDING_ROLES.map((role) => {
                const selected = roleId === role.id
                const RoleIcon = role.Icon
                return (
                  <motion.button
                    key={role.id}
                    type="button"
                    onClick={() => onRoleChange(role)}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
                      selected
                        ? "border-primary/50 bg-gradient-to-r from-primary/[0.14] to-violet-500/[0.06] ring-1 ring-inset ring-primary/25"
                        : "border-white/10 bg-white/[0.03] hover:border-primary/30 hover:bg-white/[0.06]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors",
                        selected
                          ? "bg-gradient-to-br from-primary/25 to-violet-500/15 text-primary ring-primary/25"
                          : "bg-white/5 text-muted-foreground ring-white/10 group-hover:text-foreground"
                      )}
                    >
                      <RoleIcon className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("text-sm font-semibold", selected ? "text-foreground" : "text-foreground/85")}>
                        {role.label}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{role.description}</span>
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        selected ? "border-primary bg-primary" : "border-white/15"
                      )}
                    >
                      {selected && <IconCheck className="h-3 w-3 text-primary-foreground" />}
                    </span>
                  </motion.button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground/70">
              This pre-selects a toolkit for you — you can fine-tune it on the next step.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Step 2: Tool selection ────────────────────────────────────────────────────

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

function buildCategories(): Category[] {
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

interface SelectionProps {
  selectedUrls: Set<string>
  onToggleTool: (url: string) => void
  onToggleCategory: (urls: string[], selected: boolean) => void
}

// ── Tags UI ───────────────────────────────────────────────────────────────────

function TagsToolSelection({ selectedUrls, onToggleTool, onToggleCategory }: SelectionProps) {
  const categories = React.useMemo(() => buildCategories(), [])
  const allUrls = React.useMemo(() => categories.flatMap((c) => c.tools.map((t) => t.url)), [categories])
  const allTools = React.useMemo(() => categories.flatMap((c) => c.tools), [categories])
  const selectedTools = allTools.filter((t) => selectedUrls.has(t.url))

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-6 pt-6 pb-3">
        <p className="mdt-kicker mb-2">Step 2 · Build your workspace</p>
        <h2 className="text-2xl font-bold tracking-tight">Pick the tools you&apos;ll use</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          They get pinned to your sidebar — watch it fill as you choose. Change anytime in Settings.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Picker */}
        <ScrollArea className="h-full px-6 pb-4">
          <div className="flex flex-col gap-5 pb-2">
            {categories.map((cat) => {
              const urls = cat.tools.map((t) => t.url)
              const allSelected = urls.every((u) => selectedUrls.has(u))
              const Icon = CATEGORY_ICONS[cat.title] ?? IconWand
              const iconColor = CATEGORY_ICON_COLORS[cat.title] ?? "text-primary"

              return (
                <div key={cat.title}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", iconColor)} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat.title}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                    <button
                      onClick={() => onToggleCategory(urls, !allSelected)}
                      className="text-[11px] text-muted-foreground/60 transition-colors hover:text-primary"
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
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                            selected
                              ? "border-transparent bg-gradient-to-r from-[#5b63f0] via-[#9a5cf2] to-[#4fd0e6] text-[#0a0b12] shadow-sm shadow-violet-500/25"
                              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          {ToolIcon && <ToolIcon className="h-3 w-3 flex-shrink-0" />}
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

        {/* Live sidebar preview */}
        <aside className="hidden min-h-0 flex-col border-l border-white/10 bg-black/20 lg:flex">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your sidebar
            </span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
              {selectedTools.length}
            </span>
          </div>
          {selectedTools.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <IconLayout className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Pick tools to build your sidebar.</p>
            </div>
          ) : (
            <ScrollArea className="h-full px-2 py-2">
              <AnimatePresence initial={false} mode="popLayout">
                {selectedTools.map((tool) => {
                  const ToolIcon = tool.icon
                  return (
                    <motion.div
                      key={tool.url}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-foreground/80 ring-1 ring-inset ring-white/10">
                        {ToolIcon ? <ToolIcon className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="truncate text-sm text-foreground/90">{tool.title}</span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </ScrollArea>
          )}
        </aside>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border/50 px-6 py-3">
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

// ── Checkboxes UI ─────────────────────────────────────────────────────────────

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
  const categories = React.useMemo(() => buildCategories(), [])
  const allUrls = React.useMemo(() => categories.flatMap((c) => c.tools.map((t) => t.url)), [categories])

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

// ── Dispatcher ────────────────────────────────────────────────────────────────

function ToolSelectionStep(props: SelectionProps) {
  if (TOOL_SELECTION_MODE === "checkboxes") return <CheckboxesToolSelection {...props} />
  return <TagsToolSelection {...props} />
}

// ── Step 2: Tour ──────────────────────────────────────────────────────────────

function TourStep({ slideIndex, onSlide }: { slideIndex: number; onSlide: (i: number) => void }) {
  const slide = TOUR_SLIDES[slideIndex]!

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 shrink-0">
        <p className="mdt-kicker mb-2">Step 3 · The shortcuts you&apos;ll live in</p>
        <h2 className="text-2xl font-bold tracking-tight">Quick tour</h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full flex-col items-center gap-7 text-center"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className={cn(
                "relative flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-white/10 bg-gradient-to-br shadow-lg",
                slide.bg
              )}
            >
              <slide.icon className={cn("h-12 w-12", slide.iconColor)} />
            </motion.div>
            <div className="max-w-md space-y-3">
              <h3 className="text-2xl font-semibold tracking-tight">{slide.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{slide.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* slide dots */}
      <div className="flex items-center justify-center gap-2 pb-6">
        {TOUR_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => onSlide(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === slideIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ── Root modal ────────────────────────────────────────────────────────────────

const STEPS = ["Welcome", "About you", "Choose tools", "Tour"]
const TOOLS_STEP = 2
const TOUR_STEP = 3

interface OnboardingModalProps {
  onComplete: () => void
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [tourSlide, setTourSlide] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const setPinnedTools = usePinnedToolsStore((s) => s.setPinnedTools)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)

  const { user } = useAuth(false)
  const [name, setName] = useState("")
  const [role, setRole] = useState<OnboardingRole | null>(null)

  // Pre-fill the name from the auth profile (don't ask what we already know).
  React.useEffect(() => {
    if (user?.displayName) setName((prev) => prev || user.displayName!)
  }, [user?.displayName])

  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => {
    const productivity = buildCategories().find((c) => c.title === "Productivity")
    return new Set(productivity?.tools.map((t) => t.url) ?? [])
  })

  const handleRoleChange = useCallback((next: OnboardingRole) => {
    setRole(next)
    // Role picks a curated starting toolkit; the next step lets them fine-tune.
    setSelectedUrls(new Set(next.tools))
  }, [])

  const handleToggleTool = useCallback((url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }, [])

  const handleToggleCategory = useCallback((urls: string[], add: boolean) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev)
      if (add) {
        urls.forEach((u) => next.add(u))
      } else {
        if (urls.length === 0) {
          next.clear()
        } else {
          urls.forEach((u) => next.delete(u))
        }
      }
      return next
    })
  }, [])

  const handleNext = async () => {
    // Advance tour slides before completing
    if (step === TOUR_STEP && tourSlide < TOUR_SLIDES.length - 1) {
      setTourSlide((s) => s + 1)
      return
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      setTourSlide(0)
      return
    }

    // Final step complete
    setCompleting(true)
    try {
      // Every tool the user selected becomes a sidebar pin for the active
      // workspace — pins are now the sole "which tools show" mechanism.
      const tools = Array.from(selectedUrls)
      const prefsPatch: Parameters<typeof patchUserPreferences>[0] = {}
      if (activeWorkspaceId && tools.length) {
        setPinnedTools(activeWorkspaceId, tools)
        prefsPatch.pinnedToolsByWorkspace = { [activeWorkspaceId]: tools }
      }
      const trimmedName = name.trim()
      if (trimmedName) prefsPatch.displayName = trimmedName
      if (role) prefsPatch.persona = role.id
      prefsPatch.onboardingCompleted = true
      await patchUserPreferences(prefsPatch)
    } catch {
      // non-blocking — user can still proceed
    }
    // Payoff reveal, then drop them onto their personalized home.
    setCompleting(false)
    setCelebrating(true)
    await new Promise((r) => setTimeout(r, 1600))
    onComplete()
  }

  const handleBack = () => {
    if (step === TOUR_STEP && tourSlide > 0) {
      setTourSlide((s) => s - 1)
      return
    }
    if (step > 0) setStep((s) => s - 1)
  }

  const progress = ((step + (step === TOUR_STEP ? tourSlide / TOUR_SLIDES.length : 0)) / (STEPS.length - 1)) * 100

  const isLastAction =
    step === STEPS.length - 1 && tourSlide === TOUR_SLIDES.length - 1

  // Role selection is the one thing we need before curating (step 1).
  const nextDisabled = completing || (step === 1 && !role)

  const nextLabel = isLastAction
    ? completing
      ? "Saving…"
      : "Get started"
    : step === TOUR_STEP
    ? "Next tip"
    : "Continue"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="dark mdt-deck relative isolate flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b12] text-foreground shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl"
        style={{ height: "min(90vh, 900px)" }}
      >
        {/* Deck backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <MdtAurora />
          <div className="mdt-grid" />
          <div className="mdt-noise" />
          <div className="absolute -left-24 -top-16 h-80 w-80 rounded-full bg-violet-500/15 blur-[120px]" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-500/12 blur-[110px]" />
          <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
            <defs>
              <linearGradient id="mdtGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5b63f0" />
                <stop offset="52%" stopColor="#9a5cf2" />
                <stop offset="100%" stopColor="#4fd0e6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    i === step ? "text-foreground" : i < step ? "text-primary" : "text-muted-foreground/50"
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <IconArrowRight className="w-3 h-3 text-muted-foreground/30" />
                )}
              </React.Fragment>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-0.5 rounded-none" />

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <WelcomeStep />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <AboutYouStep
                  name={name}
                  onNameChange={setName}
                  roleId={role?.id ?? null}
                  onRoleChange={handleRoleChange}
                />
              </motion.div>
            )}
            {step === TOOLS_STEP && (
              <motion.div
                key="tools"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <ToolSelectionStep
                  selectedUrls={selectedUrls}
                  onToggleTool={handleToggleTool}
                  onToggleCategory={handleToggleCategory}
                />
              </motion.div>
            )}
            {step === TOUR_STEP && (
              <motion.div
                key="tour"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <TourStep slideIndex={tourSlide} onSlide={setTourSlide} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 0 && tourSlide === 0}
            className="text-foreground/70 hover:text-foreground hover:bg-white/5"
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={nextDisabled}
            size="sm"
            className={cn(
              "gap-2 rounded-full px-5 font-semibold transition-all",
              "bg-gradient-to-r from-[#5b63f0] via-[#9a5cf2] to-[#4fd0e6] text-[#0a0b12] hover:brightness-110",
              isLastAction && "shadow-lg shadow-violet-500/30"
            )}
          >
            {nextLabel}
            {!completing && !isLastAction && <IconArrowRight className="w-4 h-4" />}
            {isLastAction && !completing && <IconCheck className="w-4 h-4" />}
          </Button>
        </div>

        {/* Payoff reveal */}
        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0b12]/95 px-8 text-center backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/25 to-violet-500/15 ring-1 ring-inset ring-white/10 shadow-lg shadow-primary/20"
              >
                <IconCheck className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.div
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <h2 className="text-3xl font-bold tracking-tight">
                  Your workspace is <span className="mdt-grad-text mdt-grad-anim">ready</span>
                </h2>
                <p className="text-muted-foreground">
                  {selectedUrls.size} tools pinned. Press{" "}
                  <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-xs">
                    ⌘K
                  </kbd>{" "}
                  anytime to launch.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
