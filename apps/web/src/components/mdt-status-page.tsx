'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion'
import MdtAurora from '@/components/mdt-aurora'

// ── Glitching gradient code (404 / 500) ────────────────────────────────────
// Base gradient glyphs + two RGB-split clones that jitter on a long delay.
function GlitchCode({ text, reduce }: { text: string; reduce: boolean }) {
  const common =
    'absolute inset-0 select-none font-bold leading-none tracking-tight'
  const jitter = (color: string, sign: number) =>
    reduce
      ? {}
      : {
          animate: { x: [0, sign * 3, sign * -2, 0], opacity: [0, 0.9, 0.6, 0] },
          transition: {
            duration: 0.45,
            times: [0, 0.3, 0.6, 1],
            repeat: Infinity,
            repeatDelay: 3.2,
            ease: 'easeInOut' as const,
          },
          style: { color, mixBlendMode: 'screen' as const },
        }
  return (
    <div
      className="relative"
      style={{ fontSize: 'clamp(6rem, 20vw, 13rem)', lineHeight: 0.9 }}
    >
      {/* readable, gradient-filled base */}
      <span className="mdt-grad-text mdt-grad-anim relative block font-bold leading-none tracking-tight">
        {text}
      </span>
      <motion.span aria-hidden className={common} {...jitter('#8a95f7', 1)}>
        {text}
      </motion.span>
      <motion.span aria-hidden className={common} {...jitter('#f0509a', -1)}>
        {text}
      </motion.span>
    </div>
  )
}

// ── Typing diagnostic terminal ──────────────────────────────────────────────
function severityClass(line: string) {
  const l = line.toLowerCase()
  if (/(404|500|exception|error|offline|fail)/.test(l)) return 'text-amber-300/90'
  if (/(ok|hint|eta|back|done|ready|retry)/.test(l)) return 'text-emerald-300/90'
  return 'text-foreground/70'
}

function DiagnosticTerminal({
  lines,
  reduce,
}: {
  lines: string[]
  reduce: boolean
}) {
  const [shown, setShown] = useState(reduce ? lines.length : 0)

  useEffect(() => {
    if (reduce || shown >= lines.length) return
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 520)
    return () => clearTimeout(id)
  }, [shown, lines.length, reduce])

  return (
    <div
      className="glass-overlay relative mx-auto w-full max-w-md overflow-hidden rounded-xl text-left"
      style={{ minHeight: `${lines.length * 1.7 + 2.6}rem` }}
    >
      <div className="mdt-rail absolute inset-x-0 top-0 h-[2px]" />
      <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          mydevtools · diagnostics
        </span>
      </div>
      <div className="space-y-1.5 px-4 py-4 font-mono text-[13px] leading-relaxed">
        {lines.slice(0, shown).map((line, i) => (
          <motion.div
            key={line}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-2"
          >
            <span className="select-none text-sky-400/70">›</span>
            <span className={severityClass(line)}>
              {line}
              {!reduce && i === shown - 1 && shown < lines.length ? (
                <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[2px] animate-pulse bg-sky-400/80" />
              ) : null}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Drifting particles (deterministic → no hydration mismatch) ──────────────
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61.8) % 100,
  delay: (i % 8) * 1.1,
  duration: 9 + (i % 5) * 2,
  size: 1 + (i % 3),
}))

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-sky-300/30"
          style={{ left: `${p.left}%`, bottom: -10, width: p.size, height: p.size }}
          animate={{ y: [0, -700], opacity: [0, 0.8, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
export function MdtStatusPage({
  code,
  kicker,
  title,
  description,
  diagnostics,
  children,
}: {
  code: ReactNode
  kicker: string
  title: string
  description: string
  diagnostics?: string[]
  children?: ReactNode
}) {
  const reduce = useReducedMotion() ?? false
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 })
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 })

  // Fixed parallax layers — hooks called unconditionally, depth = px shift.
  const codeX = useTransform(sx, (v) => v * 38)
  const codeY = useTransform(sy, (v) => v * 38)
  const kickX = useTransform(sx, (v) => v * 20)
  const kickY = useTransform(sy, (v) => v * 20)
  const titleX = useTransform(sx, (v) => v * 14)
  const titleY = useTransform(sy, (v) => v * 14)

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return
    px.set(e.clientX / window.innerWidth - 0.5)
    py.set(e.clientY / window.innerHeight - 0.5)
  }

  return (
    <div
      onMouseMove={onMove}
      className="dark mdt-deck relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center text-foreground font-sans"
    >
      {/* fixed backdrop: aurora + grid + noise + gradient def */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <MdtAurora />
        <div className="mdt-grid" />
        <div className="mdt-noise" />
        <div className="mdt-status-scanlines absolute inset-0" />
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
          <defs>
            <linearGradient id="mdtGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f56e6" />
              <stop offset="52%" stopColor="#6d7cf5" />
              <stop offset="100%" stopColor="#8a95f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <Particles />

      <motion.div
        style={reduce ? undefined : { x: sx, y: sy }}
        className="pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[460px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-[130px]"
      />

      <motion.div style={reduce ? undefined : { x: codeX, y: codeY }} className="relative">
        {typeof code === 'string' ? (
          <GlitchCode text={code} reduce={reduce} />
        ) : (
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {code}
          </motion.div>
        )}
      </motion.div>

      <motion.p
        style={reduce ? undefined : { x: kickX, y: kickY }}
        className="mdt-kicker relative mt-3"
      >
        {kicker}
      </motion.p>
      <motion.h1
        style={reduce ? undefined : { x: titleX, y: titleY }}
        className="relative mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
      >
        {title}
      </motion.h1>
      <p className="relative mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        {description}
      </p>

      {diagnostics && diagnostics.length > 0 ? (
        <div className="relative mt-8 w-full">
          <DiagnosticTerminal lines={diagnostics} reduce={reduce} />
        </div>
      ) : null}

      <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {children}
      </div>
    </div>
  )
}
