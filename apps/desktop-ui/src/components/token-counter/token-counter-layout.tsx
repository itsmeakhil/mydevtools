'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { Switch } from '@/components/ui/switch'
import { FileText, Sparkles, Trash2 } from 'lucide-react'
import { IconAbacus } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { IOPanel, ToolTextArea } from '@/components/tools/io-panel'
import {
  approxClaudeTokens,
  calcCost,
  chunkTokens,
  countWords,
  MODEL_PRICES,
  type EncodeFn,
  type DecodeFn,
} from '@/lib/token-counter'

type EncodingId = 'o200k_base' | 'cl100k_base'

interface Encoder {
  encode: EncodeFn
  decode: DecodeFn
}

const SAMPLE_TEXT =
  'The quick brown fox jumps over the lazy dog. LLM tokenization splits text into subword units — punctuation, whitespace, and rare words often cost extra tokens. Try pasting some code or JSON to see how the count changes!'

const CHUNK_LIMIT = 2000

const PASTELS = [
  'bg-rose-500/15',
  'bg-amber-500/15',
  'bg-lime-500/15',
  'bg-emerald-500/15',
  'bg-cyan-500/15',
  'bg-sky-500/15',
  'bg-violet-500/15',
  'bg-fuchsia-500/15',
]

async function loadEncoder(id: EncodingId): Promise<Encoder> {
  if (id === 'o200k_base') {
    const mod = await import('gpt-tokenizer/encoding/o200k_base')
    return { encode: (t) => mod.encode(t), decode: (toks) => mod.decode(toks) }
  }
  const mod = await import('gpt-tokenizer/encoding/cl100k_base')
  return { encode: (t) => mod.encode(t), decode: (toks) => mod.decode(toks) }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  )
}

export function TokenCounterLayout() {
  const t = useTranslations('TokenCounter')
  const [text, setText] = useState('')
  const [encodingId, setEncodingId] = useState<EncodingId>('o200k_base')
  const [encoder, setEncoder] = useState<Encoder | null>(null)
  const [tokens, setTokens] = useState<number[]>([])
  const [showViz, setShowViz] = useState(false)

  const [modelId, setModelId] = useState('claude-opus-4-8')
  const [expectedOutput, setExpectedOutput] = useState(500)
  const [customInput, setCustomInput] = useState(1)
  const [customOutput, setCustomOutput] = useState(2)

  // Lazily load the selected encoding.
  useEffect(() => {
    let cancelled = false
    setEncoder(null)
    void loadEncoder(encodingId).then((enc) => {
      if (!cancelled) setEncoder(enc)
    })
    return () => {
      cancelled = true
    }
  }, [encodingId])

  // Re-encode whenever text or encoder changes.
  useEffect(() => {
    if (!encoder) return
    setTokens(text ? encoder.encode(text) : [])
  }, [text, encoder])

  const chars = text.length
  const words = useMemo(() => countWords(text), [text])
  const tokenCount = tokens.length
  const ratio = words > 0 ? (tokenCount / words).toFixed(2) : '0.00'
  const claudeApprox = useMemo(() => approxClaudeTokens(text), [text])

  const viz = useMemo(() => {
    if (!showViz || !encoder || tokens.length === 0) return null
    return chunkTokens(encoder.decode, tokens, CHUNK_LIMIT)
  }, [showViz, encoder, tokens])

  const activeModel = MODEL_PRICES.find((m) => m.id === modelId) ?? MODEL_PRICES[0]
  const pricing =
    activeModel.id === 'custom' ? { input: customInput, output: customOutput } : activeModel
  const cost = useMemo(
    () => calcCost(tokenCount, expectedOutput, pricing),
    [tokenCount, expectedOutput, pricing],
  )

  const fmt = (n: number) => `$${n.toFixed(n < 0.01 ? 6 : 4)}`

  return (
    <ToolShell
      icon={IconAbacus}
      title={t('title')}
      description={t('subtitle')}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
        {/* Left: input + stats */}
        <div className="flex min-h-0 flex-col gap-4">
          <IOPanel
            className="min-h-[220px] flex-1"
            label={
              <>
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {t('inputLabel')}
              </>
            }
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setText(SAMPLE_TEXT)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {t('sample')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setText('')}
                  disabled={!text}
                  title={t('clear')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          >
            <ToolTextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('placeholder')}
            />
          </IOPanel>

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('encoding')}
                </Label>
                <Select value={encodingId} onValueChange={(v) => setEncodingId(v as EncodingId)}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="o200k_base">{t('encodings.o200k')}</SelectItem>
                    <SelectItem value="cl100k_base">{t('encodings.cl100k')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!encoder && <span className="pb-2 text-xs text-muted-foreground">{t('loading')}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={t('stats.tokens')} value={tokenCount.toLocaleString()} />
              <StatCard label={t('stats.characters')} value={chars.toLocaleString()} />
              <StatCard label={t('stats.words')} value={words.toLocaleString()} />
              <StatCard label={t('stats.ratio')} value={ratio} sub={t('stats.ratioSub')} />
            </div>

            <Card className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm">{t('claudeRow')}</p>
                <Badge variant="secondary" className="text-[10px]">{t('estimate')}</Badge>
              </div>
              <p className="font-mono text-lg font-semibold tabular-nums">{claudeApprox.toLocaleString()}</p>
            </Card>
          </div>
        </div>

        {/* Right: visualization + cost */}
        <div className="flex min-h-0 flex-col gap-4">
          <IOPanel
            className="min-h-[180px] flex-1"
            bodyClassName="overflow-y-auto p-3"
            label={t('viz.title')}
            actions={
              <>
                <Switch checked={showViz} onCheckedChange={setShowViz} id="viz-toggle" />
                <Label htmlFor="viz-toggle" className="text-xs text-muted-foreground">
                  {t('viz.toggle')}
                </Label>
              </>
            }
          >
            {!showViz ? (
              <p className="text-xs text-muted-foreground">{t('viz.hint')}</p>
            ) : viz ? (
              <>
                <div className="font-mono text-sm leading-relaxed">
                  {viz.chunks.map((chunk, i) => (
                    <span
                      key={i}
                      className={`rounded-sm ${PASTELS[i % PASTELS.length]}`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {chunk}
                    </span>
                  ))}
                </div>
                {viz.truncated && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('viz.truncated', { limit: CHUNK_LIMIT, total: viz.totalTokens.toLocaleString() })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t('viz.empty')}</p>
            )}
          </IOPanel>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('cost.title')}
              </Label>
              <span className="text-[11px] text-muted-foreground">{t('cost.disclaimer')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('cost.model')}</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_PRICES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('cost.expectedOutput')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            {activeModel.id === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('cost.customInput')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customInput}
                    onChange={(e) => setCustomInput(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('cost.customOutput')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customOutput}
                    onChange={(e) => setCustomOutput(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('cost.inputCost')}</p>
                <p className="font-mono font-semibold">{fmt(cost.inputCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('cost.outputCost')}</p>
                <p className="font-mono font-semibold">{fmt(cost.outputCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('cost.total')}</p>
                <p className="font-mono font-semibold">{fmt(cost.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('cost.per1000')}</p>
                <p className="font-mono font-semibold">${cost.per1000Calls.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ToolShell>
  )
}
