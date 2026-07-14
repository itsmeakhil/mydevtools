'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

export interface TopTool {
  id: string
  title: string
  icon?: React.ElementType
  count: number
  url?: string
}

interface TopToolsBarsProps {
  tools: TopTool[]
  title: string
}

export function TopToolsBars({ tools, title }: TopToolsBarsProps) {
  if (tools.length === 0) return null
  const max = Math.max(1, ...tools.map((t) => t.count))

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {tools.map((t) => {
          const Icon = t.icon ?? Zap
          return (
            <li key={t.id}>
              <Link
                href={t.url ?? '/dashboard'}
                className="group flex items-center gap-2.5 cursor-pointer"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="w-24 shrink-0 truncate text-xs text-foreground group-hover:text-primary transition-colors">
                  {t.title}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                    style={{ width: `${(t.count / max) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                  {t.count}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
