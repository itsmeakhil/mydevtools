"use client"

import { motion, AnimatePresence } from "framer-motion"
import { IconCommand, IconLayout, IconPin } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export const TOUR_SLIDES = [
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

export function TourStep({ slideIndex, onSlide }: { slideIndex: number; onSlide: (i: number) => void }) {
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
