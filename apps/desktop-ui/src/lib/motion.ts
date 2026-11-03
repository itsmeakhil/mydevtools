/**
 * Shared springs — the "liquid" half of Liquid Glass. Every surface that moves
 * uses these so the whole app feels like one material. Enter with a spring,
 * exit with a short ease; animate transform/opacity only (never blur).
 */
export const glassSpring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const
export const glassSpringSoft = { type: 'spring', stiffness: 260, damping: 28 } as const

/** Hover lift + press compression for glass cards and buttons. */
export const glassLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.985 },
  transition: glassSpring,
} as const
