"use client"

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { completeOnboarding } from "@/lib/onboarding-api"
import { useToolVisibilityStore } from "@/store/tool-visibility-store"
import { patchUserPreferences } from "@/lib/user-preferences-api"
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react"
import { WelcomeStep } from "./onboarding-modal/welcome-step"
import { TourStep, TOUR_SLIDES } from "./onboarding-modal/tour-step"
import { ToolSelectionStep, buildCategories } from "./onboarding-modal/tool-selection"

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

  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => {
    const productivity = buildCategories().find((c) => c.title === "Productivity")
    return new Set(productivity?.tools.map((t) => t.url) ?? [])
  })

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
    if (step === 2 && tourSlide < TOUR_SLIDES.length - 1) {
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
