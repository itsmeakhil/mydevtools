'use client'

import { useCallback, useState } from 'react'
import * as yaml from 'js-yaml'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/components/hooks/use-mobile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Check, Copy, Trash2, Wand2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import CodeEditor from '@/components/ui/code-editor'

const SAMPLE = `# Example YAML document
server:
  host: localhost
  port: 8080
  debug: true

database:
  url: postgres://user:pass@localhost:5432/mydb
  pool:
    min: 2
    max: 10

features:
  - name: auth
    enabled: true
  - name: metrics
    enabled: false
`

const MAX_LEN = 500_000

type OutputMode = 'yaml' | 'json'

export function YamlFormatterLayout() {
  const t = useTranslations('YamlFormatter')
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input')
  const [input, setInput] = useState(SAMPLE)
  const [output, setOutput] = useState('')
  const [outputLang, setOutputLang] = useState<OutputMode>('yaml')
  const [indent, setIndent] = useState('2')
  const [outputMode, setOutputMode] = useState<OutputMode>('yaml')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const runFormat = useCallback(() => {
    setError('')
    setCopied(false)
    if (isMobile) setMobileTab('output')
    const src = input
    if (!src.trim()) {
      setOutput('')
      return
    }
    if (src.length > MAX_LEN) {
      setError(t('errors.tooLong', { max: MAX_LEN.toLocaleString() }))
      setOutput('')
      return
    }

    const indentNum = parseInt(indent, 10) || 2

    try {
      const parsed = yaml.load(src)

      if (outputMode === 'json') {
        setOutput(JSON.stringify(parsed, null, indentNum))
        setOutputLang('json')
      } else {
        setOutput(yaml.dump(parsed, { indent: indentNum, lineWidth: -1, noRefs: true }))
        setOutputLang('yaml')
      }
    } catch (e) {
      setOutput('')
      setError(e instanceof Error ? e.message : t('errors.couldNotFormat'))
    }
  }, [input, indent, outputMode, t, isMobile])

  const handleCopy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card className="p-4 shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 w-full sm:w-auto sm:min-w-[140px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t('outputLabel')}</Label>
            <Select value={outputMode} onValueChange={(v) => setOutputMode(v as OutputMode)}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">{t('outputModes.yaml')}</SelectItem>
                <SelectItem value="json">{t('outputModes.json')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full sm:w-auto sm:min-w-[80px]">
            <Label htmlFor="yaml-indent" className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('indentLabel')}
            </Label>
            <Select value={indent} onValueChange={setIndent}>
              <SelectTrigger id="yaml-indent" className="h-9 text-sm w-full sm:w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['2', '4'].map((n) => (
                  <SelectItem key={n} value={n}>
                    {t('spaces', { n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Button type="button" size="sm" className="gap-1.5 h-9" onClick={runFormat}>
              <Wand2 className="h-3.5 w-3.5" />
              {t('format')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => {
                setInput('')
                setOutput('')
                setError('')
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('clear')}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {t('counter', { current: input.length.toLocaleString(), max: MAX_LEN.toLocaleString() })}
        </p>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-mono text-xs">{error}</p>
        </div>
      )}

      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setMobileTab('input')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'input'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('inputPanel')}
          </button>
          <button
            onClick={() => setMobileTab('output')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'output'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('outputPanel')}
          </button>
        </div>
      )}

      <div className={`flex-1 ${isMobile ? 'flex flex-col min-h-0' : 'grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0'}`}>
        {(!isMobile || mobileTab === 'input') && (
          <Card className="flex flex-col overflow-hidden min-h-[220px] flex-1">
            <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('inputPanel')}
              </Label>
            </div>
            <div className="flex-1 min-h-0 relative p-1">
              <CodeEditor
                value={input}
                onChange={setInput}
                language="yaml"
              />
            </div>
          </Card>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <Card className="flex flex-col overflow-hidden min-h-[220px] flex-1">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('outputPanel')}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!output}
                title={t('copy')}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex-1 min-h-0 relative p-1">
              <CodeEditor
                value={output}
                readOnly
                language={outputLang}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
