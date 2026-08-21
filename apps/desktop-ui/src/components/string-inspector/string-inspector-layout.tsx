'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { IconTextScan2 } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel'

interface SpecialChar {
  cp: number
  label: string
  count: number
}

const NAMED: Record<number, string> = {
  0x09: 'TAB',
  0x0a: 'LINE FEED',
  0x0d: 'CARRIAGE RETURN',
  0x00: 'NULL',
  0xa0: 'NO-BREAK SPACE',
  0x200b: 'ZERO WIDTH SPACE',
  0x200c: 'ZERO WIDTH NON-JOINER',
  0x200d: 'ZERO WIDTH JOINER',
  0xfeff: 'BYTE ORDER MARK',
  0x2028: 'LINE SEPARATOR',
  0x2029: 'PARAGRAPH SEPARATOR',
  0x00ad: 'SOFT HYPHEN',
}

function hex(cp: number): string {
  return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
}

function analyze(text: string) {
  const codePoints = Array.from(text)
  let letters = 0
  let digits = 0
  let whitespace = 0
  let punctuation = 0
  const special = new Map<number, number>()

  for (const ch of codePoints) {
    const cp = ch.codePointAt(0) ?? 0
    if (/\p{L}/u.test(ch)) letters++
    else if (/\p{Nd}/u.test(ch)) digits++
    else if (/\s/u.test(ch)) whitespace++
    else if (/\p{P}|\p{S}/u.test(ch)) punctuation++

    const isControl = cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d
    const isInvisible = cp === 0xa0 || cp === 0x00ad || (cp >= 0x200b && cp <= 0x200f) || cp === 0xfeff || cp === 0x2028 || cp === 0x2029
    const isNonAscii = cp > 0x7f
    if (isControl || isInvisible || isNonAscii) {
      special.set(cp, (special.get(cp) ?? 0) + 1)
    }
  }

  const specialChars: SpecialChar[] = Array.from(special.entries())
    .map(([cp, count]) => ({ cp, count, label: NAMED[cp] ?? '' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60)

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return {
    characters: codePoints.length,
    charactersNoSpaces: codePoints.filter((c) => !/\s/u.test(c)).length,
    words,
    lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
    sentences: (text.match(/[.!?…]+(\s|$)/g) ?? []).length,
    paragraphs: text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length : 0,
    bytes: new TextEncoder().encode(text).length,
    utf16: text.length,
    letters,
    digits,
    whitespace,
    punctuation,
    readingSeconds: Math.round((words / 200) * 60),
    specialChars,
  }
}

export function StringInspectorLayout() {
  const t = useTranslations('StringInspector')
  const [input, setInput] = useState('')
  const s = useMemo(() => analyze(input), [input])

  const primary: { label: string; value: number | string }[] = [
    { label: t('stats.characters'), value: s.characters.toLocaleString() },
    { label: t('stats.charactersNoSpaces'), value: s.charactersNoSpaces.toLocaleString() },
    { label: t('stats.words'), value: s.words.toLocaleString() },
    { label: t('stats.lines'), value: s.lines.toLocaleString() },
    { label: t('stats.sentences'), value: s.sentences.toLocaleString() },
    { label: t('stats.paragraphs'), value: s.paragraphs.toLocaleString() },
    { label: t('stats.bytes'), value: s.bytes.toLocaleString() },
    { label: t('stats.utf16'), value: s.utf16.toLocaleString() },
  ]

  const secondary: { label: string; value: number | string }[] = [
    { label: t('stats.letters'), value: s.letters.toLocaleString() },
    { label: t('stats.digits'), value: s.digits.toLocaleString() },
    { label: t('stats.whitespace'), value: s.whitespace.toLocaleString() },
    { label: t('stats.punctuation'), value: s.punctuation.toLocaleString() },
    { label: t('stats.readingTime'), value: `${s.readingSeconds}s` },
  ]

  return (
    <ToolShell
      icon={IconTextScan2}
      title={t('title')}
      description={t('subtitle')}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('panels.input')}
          actions={
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInput('')} disabled={!input} title={t('clear')}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <ToolTextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            autoComplete="off"
          />
        </IOPanel>

        <IOPanel label={null} bodyClassName="overflow-auto p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {primary.map((p) => (
              <div key={p.label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="text-lg font-bold tabular-nums">{p.value}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{p.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {secondary.map((p) => (
              <span key={p.label}>
                {p.label}: <span className="font-medium text-foreground tabular-nums">{p.value}</span>
              </span>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('specialTitle')}
            </div>
            {s.specialChars.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
                {input.trim() ? t('noSpecial') : t('specialEmpty')}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t('cols.codepoint')}</th>
                      <th className="px-3 py-2 font-medium">{t('cols.name')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('cols.count')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {s.specialChars.map((c) => (
                      <tr key={c.cp}>
                        <td className="px-3 py-1.5 font-mono">{hex(c.cp)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.label || t('nonAscii')}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  )
}
