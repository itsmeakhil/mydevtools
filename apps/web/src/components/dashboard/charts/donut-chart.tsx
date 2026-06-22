'use client'

import { donutArcs, type DonutSegment } from './chart-utils'

interface DonutChartProps {
  segments: DonutSegment[]
  centerValue?: string | number
  centerLabel?: string
  ariaLabel: string
}

// Geometry: viewBox is centered at 0,0. r chosen so circumference = 2π (unit),
// matching donutArcs() normalization, scaled by SVG units below.
const R = 1
const STROKE = 0.42

export function DonutChart({ segments, centerValue, centerLabel, ariaLabel }: DonutChartProps) {
  const arcs = donutArcs(segments)
  const hasData = segments.some((s) => s.value > 0)

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="-1.4 -1.4 2.8 2.8"
        className="h-28 w-28 shrink-0 -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {/* track */}
        <circle
          cx="0"
          cy="0"
          r={R}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
        />
        {hasData &&
          arcs.map((arc, i) => (
            <circle
              key={i}
              cx="0"
              cy="0"
              r={R}
              fill="none"
              stroke={arc.segment.color}
              strokeWidth={STROKE}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
      </svg>

      <div className="min-w-0 flex-1">
        {(centerValue !== undefined || centerLabel) && (
          <div className="mb-2">
            {centerValue !== undefined && (
              <p className="text-2xl font-bold tabular-nums leading-none">{centerValue}</p>
            )}
            {centerLabel && (
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {centerLabel}
              </p>
            )}
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate text-muted-foreground">{s.label}</span>
              <span className="ml-auto shrink-0 font-semibold tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
