'use client'

import React, { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
// Catalog data lives in a plain (non-'use client') module so Server Components
// can read it too. Re-exported here for existing client-side importers.
import { TECH_CATALOG, type TechItem } from '@/components/tech-catalog'
export { TECH_CATALOG, type TechItem }


function TechIcon({ slug, color, name, iconUrl }: { slug: string; color: string; name: string; iconUrl?: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <span
        className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: `#${color}` }}
      >
        {name[0]}
      </span>
    )
  }
  const src = iconUrl ?? `https://cdn.simpleicons.org/${slug}/${color}`
  return (
    <img
      src={src}
      alt={name}
      width={16}
      height={16}
      className="w-4 h-4 shrink-0 object-contain"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}

interface TechStackPickerProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function TechStackPicker({ value, onChange, className }: TechStackPickerProps) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, TechItem[]>()
    for (const item of TECH_CATALOG) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return map
  }, [])

  const selectedItems = useMemo(
    () => TECH_CATALOG.filter((t) => value.includes(t.name)),
    [value],
  )

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((tech) => (
            <Badge
              key={tech.name}
              variant="secondary"
              className="gap-1.5 pl-2 pr-1.5 py-1 text-xs font-medium"
            >
              <TechIcon slug={tech.slug} color={tech.color} name={tech.name} iconUrl={tech.iconUrl} />
              {tech.name}
              <button
                onClick={() => toggle(tech.name)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors ml-0.5"
                type="button"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Picker trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground h-9"
            type="button"
          >
            {value.length === 0
              ? 'Search and add technologies…'
              : `${value.length} selected — add more`}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tech, frameworks, tools…" className="h-9" />
            <CommandList className="max-h-72 overflow-y-auto">
              <CommandEmpty>No results found.</CommandEmpty>
              {Array.from(grouped.entries()).map(([category, items]) => (
                <CommandGroup key={category} heading={category}>
                  {items.map((tech) => {
                    const selected = value.includes(tech.name)
                    return (
                      <CommandItem
                        key={tech.name}
                        value={tech.name}
                        onSelect={() => toggle(tech.name)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <TechIcon slug={tech.slug} color={tech.color} name={tech.name} iconUrl={tech.iconUrl} />
                        <span className="flex-1 text-sm">{tech.name}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
