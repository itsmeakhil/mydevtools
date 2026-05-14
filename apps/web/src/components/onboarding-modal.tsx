"use client"

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { completeOnboarding } from "@/lib/onboarding-api"
import { useToolVisibilityStore, DEFAULT_ENABLED_TOOLS } from "@/store/tool-visibility-store"
import { patchUserPreferences } from "@/lib/user-preferences-api"
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

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-10 gap-6">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <IconRocket className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
          <IconCheck className="w-3 h-3 text-white" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold tracking-tight">Welcome to mydevtools</h2>
        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          Your all-in-one developer toolkit. Let's take 30 seconds to personalise your sidebar and
          show you the highlights.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {["60+ tools", "Synced across devices", "Works offline", "Privacy-first"].map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs px-3 py-1">
            {tag}
          </Badge>
        ))}
      </motion.div>
    </div>
  )
}

// ── Step 1: Tool selection ────────────────────────────────────────────────────

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
                {/* Category header */}
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

                {/* Tool tags */}
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
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-2xl font-bold tracking-tight">Quick tour</h2>
        <p className="text-muted-foreground text-sm mt-1">A few things that will save you time.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center gap-6 text-center"
          >
            <div
              className={cn(
                "w-24 h-24 rounded-3xl bg-gradient-to-br flex items-center justify-center border border-white/10",
                slide.bg
              )}
            >
              <slide.icon className={cn("w-11 h-11", slide.iconColor)} />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-semibold">{slide.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{slide.description}</p>
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

const STEPS = ["Welcome", "Choose tools", "Tour"]

interface OnboardingModalProps {
  onComplete: () => void
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [tourSlide, setTourSlide] = useState(0)
  const [completing, setCompleting] = useState(false)

  const setEnabledTools = useToolVisibilityStore((s) => s.setEnabledTools)

  // Pre-select DEFAULT_ENABLED_TOOLS. New tools added to sidebarData always appear
  // in the picker (via buildCategories) but are unselected until added to DEFAULT_ENABLED_TOOLS.
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(
    () => new Set(DEFAULT_ENABLED_TOOLS)
  )

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
    if (step < STEPS.length - 1) {
      if (step === 1) {
        // tour step — advance slide first
        if (tourSlide < TOUR_SLIDES.length - 1) {
          setTourSlide((s) => s + 1)
          return
        }
      }
      setStep((s) => s + 1)
      setTourSlide(0)
      return
    }

    // Final step complete
    setCompleting(true)
    try {
      const tools = Array.from(selectedUrls)
      setEnabledTools(tools)
      await Promise.all([
        completeOnboarding(),
        patchUserPreferences({ enabledTools: tools }),
      ])
    } catch {
      // non-blocking — user can still proceed
    } finally {
      setCompleting(false)
      onComplete()
    }
  }

  const handleBack = () => {
    if (step === 2 && tourSlide > 0) {
      setTourSlide((s) => s - 1)
      return
    }
    if (step > 0) setStep((s) => s - 1)
  }

  const progress = ((step + (step === 2 ? tourSlide / TOUR_SLIDES.length : 0)) / (STEPS.length - 1)) * 100

  const isLastAction =
    step === STEPS.length - 1 && tourSlide === TOUR_SLIDES.length - 1

  const nextLabel = isLastAction
    ? completing
      ? "Saving…"
      : "Get started"
    : step === 2
    ? "Next tip"
    : "Continue"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-full max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "min(90vh, 900px)" }}
      >
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
            {step === 2 && (
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
            className="text-muted-foreground"
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={completing}
            size="sm"
            className={cn(
              "gap-2 transition-all",
              isLastAction && "bg-primary hover:bg-primary/90 shadow-md shadow-primary/25"
            )}
          >
            {nextLabel}
            {!completing && !isLastAction && <IconArrowRight className="w-4 h-4" />}
            {isLastAction && !completing && <IconCheck className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
