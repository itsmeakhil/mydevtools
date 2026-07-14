'use client'

import { useCallback, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import * as yaml from 'js-yaml'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { IconFileCode } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs'
import { CopyIconButton } from '@/components/tools/copy-icon-button'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Trash2, Wand2 } from 'lucide-react'
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
  const { isCopied: copied, copyToClipboard, reset: resetCopied } = useCopyToClipboard()

  const runFormat = useCallback(() => {
    setError('')
    resetCopied()
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
  }, [input, indent, outputMode, t, isMobile, resetCopied])

  const handleCopy = () => {
    if (!output) return
    void copyToClipboard(output, { silent: true })
  }

  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconFileCode} title={t('title')} description={t('subtitle')} />
      </RevealItem>

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
            <Button type="button" variant="gradient" size="sm" className="gap-1.5 h-9" onClick={runFormat}>
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
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputPanel') },
            { value: 'output', label: t('outputPanel') },
          ]}
        />
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
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
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
