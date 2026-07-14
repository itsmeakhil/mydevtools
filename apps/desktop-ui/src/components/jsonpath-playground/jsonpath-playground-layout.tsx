'use client'

import React, { useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BookOpen,
  Braces,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { IconZoomCode } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import {
  CHEATSHEET,
  QUERY_ENGINES,
  SAMPLE_JSON,
  formatJsonText,
  runJsonQuery,
  type QueryEngine,
} from '@/lib/jsonpath-playground'

const ENGINE_LABEL_KEY: Record<QueryEngine, string> = {
  jsonpath: 'engines.jsonpath',
  jmespath: 'engines.jmespath',
}

const DEFAULT_QUERY: Record<QueryEngine, string> = {
  jsonpath: '$.store.books[*].title',
  jmespath: 'store.books[*].title',
}

export function JsonpathPlaygroundLayout() {
  const t = useTranslations('JsonpathPlayground')
  const [jsonText, setJsonText] = useState('')
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState<QueryEngine>('jsonpath')
  const [cheatsOpen, setCheatsOpen] = useState(false)
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const [debouncedJson] = useDebounce(jsonText, 300)
  const [debouncedQuery] = useDebounce(query, 300)

  const result = useMemo(
    () => runJsonQuery(debouncedJson, debouncedQuery, engine),
    [debouncedJson, debouncedQuery, engine],
  )

  const loadSample = () => {
    setJsonText(SAMPLE_JSON)
    if (!query.trim()) setQuery(DEFAULT_QUERY[engine])
  }

  const formatInput = () => {
    const res = formatJsonText(jsonText)
    if (res.error) {
      toast.error(t('formatError'))
    } else {
      setJsonText(res.output)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconZoomCode}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Formatters}
        />
      </RevealItem>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('engineLabel')}</Label>
            <Select value={engine} onValueChange={(v) => setEngine(v as QueryEngine)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUERY_ENGINES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {t(ENGINE_LABEL_KEY[e])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('queryLabel')}</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={engine === 'jsonpath' ? '$.store.books[*].title' : 'store.books[*].title'}
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => setCheatsOpen((o) => !o)}>
            <BookOpen className="mr-1.5 h-4 w-4" />
            {t('cheatsheet')}
            <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform ${cheatsOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {cheatsOpen && (
          <div className="grid grid-cols-1 gap-1.5 border-t border-border/50 pt-3 sm:grid-cols-2">
            {CHEATSHEET[engine].map((entry) => (
              <button
                key={entry.expression}
                type="button"
                onClick={() => setQuery(entry.expression)}
                className="flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
              >
                <code className="shrink-0 font-mono text-xs text-primary">{entry.expression}</code>
                <span className="truncate text-xs text-muted-foreground">{t(`cheats.${entry.key}`)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.input')}</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={loadSample}>
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {t('sample')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={formatInput} disabled={!jsonText.trim()}>
                <WandSparkles className="mr-1 h-3.5 w-3.5" />
                {t('format')}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setJsonText('')} disabled={!jsonText} title={t('clear')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={t('placeholder')}
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Braces className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.results')}</Label>
              {!result.error && result.output && (
                <Badge variant="secondary" className="text-[10px]">
                  {t('matchCount', { count: result.count })}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!result.output}
              onClick={() => void copyToClipboard(result.output, { silent: true })}
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copy')}
            </Button>
          </div>
          {result.error && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {result.error}
            </div>
          )}
          <ScrollArea className="min-h-0 flex-1">
            {result.output ? (
              <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words">{result.output}</pre>
            ) : (
              <div className="p-4 text-sm text-muted-foreground/60">{t('outputPlaceholder')}</div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
