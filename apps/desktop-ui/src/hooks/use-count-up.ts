'use client'

import { useEffect, useState } from 'react'

/**
 * Animate a number from 0 → target with an ease-out curve on mount/target change.
 * Under prefers-reduced-motion the duration collapses to 0 so it lands on the
 * target on the first frame (no misleading lingering "0").
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduce ? 0 : durationMs
    let raf = 0
    let start: number | null = null

    const tick = (now: number) => {
      if (start === null) start = now
      const progress = duration <= 0 ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Safety net: if rAF is throttled (backgrounded/inactive tab), still land on target.
    const fallback = setTimeout(() => setValue(target), duration + 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
  }, [target, durationMs])

  return value
}
