'use client'

import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Special sentinel stored in value to mean "Present"
export const PRESENT_VALUE = 'present'

interface MonthPickerProps {
  value: string        // "YYYY-MM", "present", or ""
  onChange: (val: string) => void
  placeholder?: string
  allowPresent?: boolean
  className?: string
}

function parseValue(val: string): { year: number; month: number } | null {
  if (!val || val === PRESENT_VALUE || !/^\d{4}-\d{2}$/.test(val)) return null
  const [y, m] = val.split('-').map(Number)
  return { year: y, month: m }
}

export function MonthPicker({
  value,
  onChange,
  placeholder = 'Select month',
  allowPresent = false,
  className,
}: MonthPickerProps) {
  const parsed = parseValue(value)
  const isPresent = value === PRESENT_VALUE
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.year ?? new Date().getFullYear())

  const currentYear = new Date().getFullYear()

  const select = (month: number) => {
    const mm = String(month).padStart(2, '0')
    onChange(`${viewYear}-${mm}`)
    setOpen(false)
  }

  const selectPresent = () => {
    onChange(PRESENT_VALUE)
    setOpen(false)
  }

  const label = isPresent
    ? 'Present'
    : parsed
    ? `${MONTHS[parsed.month - 1]} ${parsed.year}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 w-full justify-start gap-2 font-normal text-sm',
            !parsed && !isPresent && 'text-muted-foreground',
            isPresent && 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
            className
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-50" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Present option */}
        {allowPresent && (
          <button
            onClick={selectPresent}
            className={cn(
              'w-full mb-3 rounded-md px-3 py-2 text-sm font-medium text-left transition-colors border',
              isPresent
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Present — currently here
          </button>
        )}

        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={viewYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, idx) => {
            const monthNum = idx + 1
            const isSelected = !isPresent && parsed?.year === viewYear && parsed?.month === monthNum
            const isFuture = viewYear === currentYear && monthNum > new Date().getMonth() + 1
            return (
              <button
                key={name}
                disabled={isFuture}
                onClick={() => select(monthNum)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-foreground',
                  isFuture && 'opacity-30 cursor-not-allowed'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>

        {/* Clear */}
        {(parsed || isPresent) && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
