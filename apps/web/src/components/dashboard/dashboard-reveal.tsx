'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Mount fade-up for a dashboard section, staggered by `index`.
 *
 * Animates opacity + y only (compositor-friendly) and resolves to a static
 * wrapper under prefers-reduced-motion. Do NOT wrap a position:sticky element
 * in this — the residual transform would break stickiness; render those plainly.
 */
export function RevealItem({
  index = 0,
  children,
  className,
}: {
  index?: number
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
