"use client"

// Simple calendar component using HTML input type="date"
// This is a temporary solution until react-day-picker can be installed

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
}

function Calendar({
  className,
  selected,
  onSelect,
  initialFocus,
  ...props
}: CalendarProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      onSelect?.(new Date(event.target.value))
    } else {
      onSelect?.(undefined)
    }
  }

  const dateValue = selected ? selected.toISOString().split('T')[0] : ''

  return (
    <div className={cn("p-3", className)}>
      <input
        type="date"
        value={dateValue}
        onChange={handleChange}
        className="w-full p-2 border rounded-md bg-background text-foreground"
        autoFocus={initialFocus}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

