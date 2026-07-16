'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRightLeft, Copy, Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { convert, UNIT_CATEGORIES, getCategoryKeys, getUnitKeys } from '@/lib/unit-converter'
import { IconRuler } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

function formatResult(n: number): string {
  if (!isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e-4 && abs < 1e12) {
    return parseFloat(n.toPrecision(10)).toString()
  }
  return n.toExponential(6)
}

export function UnitConverterLayout() {
  const t = useTranslations('UnitConverter')
  const categoryKeys = useMemo(() => getCategoryKeys(), [])

  const [categoryKey, setCategoryKey] = useState(categoryKeys[0] ?? '')
  const [fromKey, setFromKey] = useState('')
  const [toKey, setToKey] = useState('')
  const [inputValue, setInputValue] = useState('1')
  const [copied, setCopied] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const unitKeys = useMemo(() => getUnitKeys(categoryKey), [categoryKey])

  useEffect(() => {
    const keys = getUnitKeys(categoryKey)
    setFromKey(keys[0] ?? '')
    setToKey(keys[1] ?? keys[0] ?? '')
  }, [categoryKey])

  const category = UNIT_CATEGORIES[categoryKey]

  const result = useMemo(() => {
    if (!category || !fromKey || !toKey) return null
    const num = parseFloat(inputValue)
    if (isNaN(num)) return null
    return convert(num, fromKey, toKey, category)
  }, [inputValue, fromKey, toKey, category])

  const resultText = result !== null ? formatResult(result) : ''
  const fromSymbol = category?.units[fromKey]?.symbol ?? ''
  const toSymbol = category?.units[toKey]?.symbol ?? ''

  function swap() {
    setFromKey(toKey)
    setToKey(fromKey)
  }

  const copyResult = useCallback(() => {
    if (!resultText) return
    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [resultText])

  return (
    <div className="relative space-y-5 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconRuler}
          title={t('title')}
          description={t.rich('subtitle', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <div className="max-w-2xl mx-auto space-y-5">
      {/* Category — searchable combobox */}
      <div className="space-y-1.5">
        <Label>{t('category')}</Label>
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">
                {categoryKey ? UNIT_CATEGORIES[categoryKey]?.label : t('selectCategory')}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('searchCategory')} />
              <CommandList>
                <CommandEmpty>{t('noResults')}</CommandEmpty>
                <CommandGroup className="max-h-72 overflow-auto">
                  {categoryKeys.map((k) => (
                    <CommandItem
                      key={k}
                      value={UNIT_CATEGORIES[k].label}
                      onSelect={() => {
                        setCategoryKey(k)
                        setCategoryOpen(false)
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 shrink-0 ${k === categoryKey ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {UNIT_CATEGORIES[k].label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* From / Swap / To */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5 min-w-0">
          <Label>{t('from')}</Label>
          <Select value={fromKey} onValueChange={setFromKey}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {unitKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {category?.units[k]?.label} ({category?.units[k]?.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 mb-0.5"
          onClick={swap}
          title={t('swapUnits')}
          aria-label={t('swapUnits')}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 space-y-1.5 min-w-0">
          <Label>{t('to')}</Label>
          <Select value={toKey} onValueChange={setToKey}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {unitKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {category?.units[k]?.label} ({category?.units[k]?.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Value input */}
      <div className="space-y-1.5">
        <Label htmlFor="value-input">{t('value')}</Label>
        <Input
          id="value-input"
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('placeholder')}
          className="font-mono"
        />
      </div>

      {/* Result — always rendered so the layout never jumps on invalid input */}
      <Card aria-live="polite">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {result !== null && (
                <p className="text-sm text-muted-foreground font-mono">
                  {inputValue.trim()} {fromSymbol} =
                </p>
              )}
              <p className="text-2xl font-mono font-semibold tracking-tight break-all">
                {result !== null ? (
                  <>
                    {resultText}{' '}
                    <span className="text-base font-normal text-muted-foreground">{toSymbol}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyResult}
              disabled={result === null}
              title={t('copyResult')}
              aria-label={t('copyResult')}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
