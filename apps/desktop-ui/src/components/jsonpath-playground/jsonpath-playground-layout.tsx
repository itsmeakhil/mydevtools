'use client'

import React, { useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { IconZoomCode } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel'
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

  const toolbar = (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
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
    </div>
  )

  return (
    <ToolShell
      icon={IconZoomCode}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('panels.input')}
          actions={
            <>
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
            </>
          }
        >
          <ToolTextArea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={t('placeholder')}
            autoComplete="off"
          />
        </IOPanel>

        <IOPanel
          label={
            <>
              {t('panels.results')}
              {!result.error && result.output && (
                <Badge variant="secondary" className="text-[10px]">
                  {t('matchCount', { count: result.count })}
                </Badge>
              )}
            </>
          }
          bodyClassName="overflow-auto"
          actions={
            <Button
              size="sm"
              variant="secondary"
              disabled={!result.output}
              onClick={() => void copyToClipboard(result.output, { silent: true })}
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copy')}
            </Button>
          }
        >
          {result.error && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {result.error}
            </div>
          )}
          {result.output ? (
            <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words">{result.output}</pre>
          ) : (
            <div className="p-4 text-sm text-muted-foreground/60">{t('outputPlaceholder')}</div>
          )}
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  )
}
