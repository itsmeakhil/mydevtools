'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface DOBPickerProps {
  value: string        // "YYYY-MM-DD" or ""
  onChange: (val: string) => void
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parse(val: string) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return { y: '', m: '', d: '' }
  const [y, m, d] = val.split('-')
  return { y, m, d }
}

const selectCls = cn(
  'h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm',
  'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'appearance-none cursor-pointer text-foreground',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

export function DOBPicker({ value, onChange, className }: DOBPickerProps) {
  const { y, m, d } = parse(value)

  const currentYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: currentYear - 1923 }, (_, i) => String(currentYear - i)),
    [currentYear]
  )

  const daysInMonth = useMemo(() => {
    if (!y || !m) return 31
    return new Date(parseInt(y), parseInt(m), 0).getDate()
  }, [y, m])

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')),
    [daysInMonth]
  )

  const emit = (nextY: string, nextM: string, nextD: string) => {
    if (!nextY || !nextM || !nextD) { onChange(''); return }
    // clamp day if month changed and day is out of range
    const max = new Date(parseInt(nextY), parseInt(nextM), 0).getDate()
    const clampedD = Math.min(parseInt(nextD), max).toString().padStart(2, '0')
    onChange(`${nextY}-${nextM}-${clampedD}`)
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Day */}
      <div className="relative flex-1">
        <select
          value={d}
          onChange={(e) => emit(y, m, e.target.value)}
          className={cn(selectCls, 'w-full pr-1', !d && 'text-muted-foreground')}
        >
          <option value="" disabled>Day</option>
          {days.map((day) => (
            <option key={day} value={day}>{parseInt(day)}</option>
          ))}
        </select>
      </div>

      {/* Month */}
      <div className="relative flex-[2]">
        <select
          value={m}
          onChange={(e) => emit(y, e.target.value, d)}
          className={cn(selectCls, 'w-full pr-1', !m && 'text-muted-foreground')}
        >
          <option value="" disabled>Month</option>
          {MONTHS.map((name, idx) => {
            const val = String(idx + 1).padStart(2, '0')
            return <option key={val} value={val}>{name}</option>
          })}
        </select>
      </div>

      {/* Year */}
      <div className="relative flex-[1.5]">
        <select
          value={y}
          onChange={(e) => emit(e.target.value, m, d)}
          className={cn(selectCls, 'w-full pr-1', !y && 'text-muted-foreground')}
        >
          <option value="" disabled>Year</option>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
