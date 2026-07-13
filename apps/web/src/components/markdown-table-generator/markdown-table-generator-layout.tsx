'use client'

import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  Copy,
  FileCode,
  Plus,
  Table as TableIcon,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Trash2,
  X,
} from 'lucide-react'
import { IconTable } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import {
  SAMPLE_ALIGNS,
  SAMPLE_HEADERS,
  SAMPLE_ROWS,
  buildHtmlTable,
  buildMarkdownTable,
  parseDelimited,
  type ColumnAlign,
} from '@/lib/markdown-table-generator'

export function MarkdownTableGeneratorLayout() {
  const t = useTranslations('MarkdownTableGenerator')
  const [headers, setHeaders] = useState<string[]>([...SAMPLE_HEADERS])
  const [rows, setRows] = useState<string[][]>(SAMPLE_ROWS.map((r) => [...r]))
  const [aligns, setAligns] = useState<ColumnAlign[]>([...SAMPLE_ALIGNS])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [tab, setTab] = useState<'markdown' | 'html'>('markdown')
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const markdown = useMemo(() => buildMarkdownTable(headers, rows, aligns), [headers, rows, aligns])
  const html = useMemo(() => buildHtmlTable(headers, rows, aligns), [headers, rows, aligns])

  const setHeader = (i: number, value: string) => {
    setHeaders((h) => h.map((c, idx) => (idx === i ? value : c)))
  }

  const setCell = (r: number, c: number, value: string) => {
    setRows((rs) => rs.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)))
  }

  const setAlign = (i: number, value: ColumnAlign) => {
    setAligns((a) => a.map((al, idx) => (idx === i ? value : al)))
  }

  const addRow = () => setRows((rs) => [...rs, Array.from({ length: headers.length }, () => '')])

  const addColumn = () => {
    setHeaders((h) => [...h, ''])
    setAligns((a) => [...a, 'left'])
    setRows((rs) => rs.map((r) => [...r, '']))
  }

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  const removeColumn = (i: number) => {
    if (headers.length <= 1) return
    setHeaders((h) => h.filter((_, idx) => idx !== i))
    setAligns((a) => a.filter((_, idx) => idx !== i))
    setRows((rs) => rs.map((r) => r.filter((_, idx) => idx !== i)))
  }

  const clearAll = () => {
    setHeaders(['', '', ''])
    setAligns(['left', 'left', 'left'])
    setRows([['', '', ''], ['', '', '']])
  }

  const importGrid = (text: string) => {
    const parsed = parseDelimited(text)
    if (parsed.length === 0) {
      toast.error(t('importEmpty'))
      return
    }
    const cols = Math.max(...parsed.map((r) => r.length))
    const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '')
    setHeaders(pad(parsed[0]))
    setRows(parsed.length > 1 ? parsed.slice(1).map(pad) : [Array.from({ length: cols }, () => '')])
    setAligns(Array.from({ length: cols }, () => 'left' as ColumnAlign))
    setPasteText('')
    setPasteOpen(false)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      importGrid(text)
    } catch {
      toast.error(t('clipboardError'))
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconTable}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Generators}
        />
      </RevealItem>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('addRow')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('addColumn')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPasteOpen((o) => !o)}>
            <ClipboardPaste className="mr-1.5 h-4 w-4" />
            {t('importLabel')}
            <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform ${pasteOpen ? 'rotate-180' : ''}`} />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={clearAll}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t('clear')}
          </Button>
        </div>

        {pasteOpen && (
          <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t('importPlaceholder')}
              className="h-24 w-full resize-none rounded-md border border-border/50 bg-transparent p-3 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => importGrid(pasteText)} disabled={!pasteText.trim()}>
                {t('importButton')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void pasteFromClipboard()}>
                <ClipboardPaste className="mr-1.5 h-4 w-4" />
                {t('pasteClipboard')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.editor')}</Label>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-3">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    {headers.map((_, i) => (
                      <th key={i} className="min-w-[140px] align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <ToggleGroup
                            type="single"
                            size="sm"
                            value={aligns[i]}
                            onValueChange={(v) => v && setAlign(i, v as ColumnAlign)}
                          >
                            <ToggleGroupItem value="left" className="h-6 w-6 p-0" title={t('align.left')} aria-label={t('align.left')}>
                              <TextAlignStart className="h-3 w-3" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="center" className="h-6 w-6 p-0" title={t('align.center')} aria-label={t('align.center')}>
                              <TextAlignCenter className="h-3 w-3" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="right" className="h-6 w-6 p-0" title={t('align.right')} aria-label={t('align.right')}>
                              <TextAlignEnd className="h-3 w-3" />
                            </ToggleGroupItem>
                          </ToggleGroup>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            onClick={() => removeColumn(i)}
                            disabled={headers.length <= 1}
                            title={t('removeColumn')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                    <th />
                  </tr>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i}>
                        <Input
                          value={h}
                          onChange={(e) => setHeader(i, e.target.value)}
                          placeholder={t('headerPlaceholder')}
                          className="h-8 font-semibold text-sm"
                          spellCheck={false}
                        />
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => (
                    <tr key={r}>
                      {headers.map((_, c) => (
                        <td key={c}>
                          <Input
                            value={row[c] ?? ''}
                            onChange={(e) => setCell(r, c, e.target.value)}
                            placeholder={t('cellPlaceholder')}
                            className="h-8 text-sm"
                            spellCheck={false}
                          />
                        </td>
                      ))}
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={() => removeRow(r)}
                          disabled={rows.length <= 1}
                          title={t('removeRow')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-0">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as 'markdown' | 'html')}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.output')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="h-8">
                  <TabsTrigger value="markdown" className="px-3 text-xs">{t('tabs.markdown')}</TabsTrigger>
                  <TabsTrigger value="html" className="px-3 text-xs">{t('tabs.html')}</TabsTrigger>
                </TabsList>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!(tab === 'markdown' ? markdown : html)}
                  onClick={() => void copyToClipboard(tab === 'markdown' ? markdown : html, { silent: true })}
                >
                  {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            </div>
            <TabsContent value="markdown" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">
                <pre className="p-4 font-mono text-sm">{markdown}</pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="html" className="mt-0 min-h-0 flex-1">
              <ScrollArea className="h-full">
                <pre className="p-4 font-mono text-sm">{html}</pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
