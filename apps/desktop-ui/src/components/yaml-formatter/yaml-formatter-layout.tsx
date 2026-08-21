'use client'

import { useCallback, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import * as yaml from 'js-yaml'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { IconFileCode } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel } from '@/components/tools/io-panel'
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs'
import { CopyIconButton } from '@/components/tools/copy-icon-button'
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
      // js-yaml v4: load() is the safe schema, !!js/function was removed.
      // threatcrush-disable-next-line js-unsafe-yaml-load
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

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
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
                {n}
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
      <p className="w-full text-[11px] text-muted-foreground">
        {t('counter', { current: input.length.toLocaleString(), max: MAX_LEN.toLocaleString() })}
      </p>
    </div>
  )

  return (
    <ToolShell
      icon={IconFileCode}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive shrink-0 mb-4">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-mono text-xs">{error}</p>
        </div>
      )}

      {isMobile && (
        <div className="mb-4">
          <ToolMobileTabs
            value={mobileTab}
            onValueChange={setMobileTab}
            tabs={[
              { value: 'input', label: t('inputPanel') },
              { value: 'output', label: t('outputPanel') },
            ]}
          />
        </div>
      )}

      <ToolPanels className="lg:grid-cols-2">
        {(!isMobile || mobileTab === 'input') && (
          <IOPanel label={t('inputPanel')} bodyClassName="p-1">
            <CodeEditor value={input} onChange={setInput} language="yaml" />
          </IOPanel>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <IOPanel
            label={t('outputPanel')}
            bodyClassName="p-1"
            actions={
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
            }
          >
            <CodeEditor value={output} readOnly language={outputLang} />
          </IOPanel>
        )}
      </ToolPanels>
    </ToolShell>
  )
}
