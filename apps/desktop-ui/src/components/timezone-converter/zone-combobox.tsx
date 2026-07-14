'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatOffset, splitZone, zoneLabel } from '@/lib/timezone-converter'

interface ZoneComboboxProps {
  zones: string[]
  /** Map of zone id -> current UTC offset in minutes. */
  offsets: Record<string, number>
  value?: string
  placeholder: string
  onSelect: (tz: string) => void
  /** Custom trigger content (e.g. an "Add zone" button label). */
  triggerLabel?: React.ReactNode
  triggerVariant?: 'outline' | 'secondary'
  className?: string
}

export function ZoneCombobox({
  zones,
  offsets,
  value,
  placeholder,
  onSelect,
  triggerLabel,
  triggerVariant = 'outline',
  className,
}: ZoneComboboxProps) {
  const t = useTranslations('TimezoneConverter')
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const tz of zones) {
      const { region } = splitZone(tz)
      const key = region || 'Other'
      const list = groups.get(key) ?? []
      list.push(tz)
      groups.set(key, list)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [zones])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={triggerVariant}
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', className)}
        >
          <span className="truncate">{triggerLabel ?? (value ? zoneLabel(value) : placeholder)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('searchZone')} />
          <CommandList>
            <CommandEmpty>{t('noZone')}</CommandEmpty>
            {grouped.map(([region, regionZones]) => (
              <CommandGroup key={region} heading={region}>
                {regionZones.map((tz) => (
                  <CommandItem
                    key={tz}
                    value={tz.replace(/[_/]/g, ' ')}
                    onSelect={() => {
                      onSelect(tz)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === tz ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{zoneLabel(tz)}</span>
                    <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                      {offsets[tz] !== undefined ? formatOffset(offsets[tz]) : ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
