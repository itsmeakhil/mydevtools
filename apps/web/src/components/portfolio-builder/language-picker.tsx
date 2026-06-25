'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LANGUAGE_LEVELS, type LanguageEntry } from './personal-info-types'

export function LanguagePicker({
  value,
  onChange,
}: {
  value: LanguageEntry[]
  onChange: (v: LanguageEntry[]) => void
}) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState<string>('Fluent')

  const add = () => {
    const t = name.trim()
    if (t && !value.find((v) => v.name.toLowerCase() === t.toLowerCase())) {
      onChange([...value, { name: t, level }])
      setName('')
      setLevel('Fluent')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. English, Spanish…"
          className="h-9 flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-9 px-3">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item.name} variant="secondary" className="gap-1 pr-1 text-xs">
              {item.name}
              <span className="text-muted-foreground/70 ml-0.5">· {item.level}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.name !== item.name))}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
