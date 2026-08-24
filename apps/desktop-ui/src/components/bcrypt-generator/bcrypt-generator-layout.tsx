'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Check,
  CircleCheck,
  CircleX,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import { IconShieldLock } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import {
  hashPassword,
  parseBcryptHash,
  verifyPassword,
  type ParsedBcryptHash,
} from '@/lib/bcrypt-generator'

const SLOW_COST_THRESHOLD = 13

const SEGMENT_STYLES = {
  version: 'text-blue-600 dark:text-blue-400',
  cost: 'text-amber-600 dark:text-amber-400',
  salt: 'text-emerald-600 dark:text-emerald-400',
  digest: 'text-purple-600 dark:text-purple-400',
} as const

function PasswordInput({
  value,
  onChange,
  placeholder,
  showLabel,
  hideLabel,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  showLabel: string
  hideLabel: string
  id: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono"
        autoComplete="off"
        spellCheck={false}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        title={visible ? hideLabel : showLabel}
        aria-label={visible ? hideLabel : showLabel}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function HashAnatomy({ parsed }: { parsed: ParsedBcryptHash }) {
  const t = useTranslations('BcryptGenerator')
  const costStr = String(parsed.cost).padStart(2, '0')
  const segments = [
    { key: 'version', value: parsed.version, style: SEGMENT_STYLES.version, label: t('hash.anatomy.algorithm') },
    { key: 'cost', value: costStr, style: SEGMENT_STYLES.cost, label: t('hash.anatomy.cost') },
    { key: 'salt', value: parsed.salt, style: SEGMENT_STYLES.salt, label: t('hash.anatomy.salt') },
    { key: 'digest', value: parsed.digest, style: SEGMENT_STYLES.digest, label: t('hash.anatomy.hash') },
  ]
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t('hash.anatomy.title')}
      </Label>
      <div className="break-all rounded-md border border-border bg-[hsl(var(--surface-2))] p-3 font-mono text-sm">
        <span className="text-muted-foreground">$</span>
        <span className={SEGMENT_STYLES.version}>{parsed.version}</span>
        <span className="text-muted-foreground">$</span>
        <span className={SEGMENT_STYLES.cost}>{costStr}</span>
        <span className="text-muted-foreground">$</span>
        <span className={SEGMENT_STYLES.salt}>{parsed.salt}</span>
        <span className={SEGMENT_STYLES.digest}>{parsed.digest}</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className={`font-mono font-semibold ${s.style}`}>{s.value.length > 10 ? `${s.value.slice(0, 8)}…` : s.value}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HashTab() {
  const t = useTranslations('BcryptGenerator')
  const [password, setPassword] = useState('')
  const [cost, setCost] = useState(10)
  const [hashing, setHashing] = useState(false)
  const [result, setResult] = useState<{ hash: string; ms: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const generate = useCallback(async () => {
    setHashing(true)
    setError(null)
    try {
      const start = performance.now()
      const hash = await hashPassword(password, cost)
      setResult({ hash, ms: Math.round(performance.now() - start) })
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setHashing(false)
    }
  }, [password, cost])

  const parsed = result ? parseBcryptHash(result.hash) : null

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bcrypt-hash-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('hash.passwordLabel')}
        </Label>
        <PasswordInput
          id="bcrypt-hash-password"
          value={password}
          onChange={setPassword}
          placeholder={t('hash.passwordPlaceholder')}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('hash.costLabel')}
          </Label>
          <Badge variant="secondary" className="font-mono">{cost}</Badge>
        </div>
        <Slider
          value={[cost]}
          onValueChange={(v) => setCost(v[0])}
          min={4}
          max={15}
          step={1}
          aria-label={t('hash.costLabel')}
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>4</span>
          <span>15</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('hash.costHint')}</p>
        {cost >= SLOW_COST_THRESHOLD && (
          <div role="status" className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {t('hash.slowWarning')}
          </div>
        )}
      </div>

      <Button className="w-full" onClick={() => void generate()} disabled={!password || hashing}>
        <KeyRound className="mr-1.5 h-4 w-4" />
        {hashing ? t('hash.generating') : t('hash.generate')}
      </Button>

      {error && <div role="alert" className="text-sm text-destructive">{error}</div>}

      {result && (
        <div role="status" aria-live="polite" className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('hash.resultLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 font-mono">
                <Timer className="h-3 w-3" />
                {t('hash.timeTaken', { ms: result.ms })}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void copyToClipboard(result.hash, { silent: true })}
              >
                {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
          <div className="break-all rounded-md border border-border bg-[hsl(var(--surface-2))] p-3 font-mono text-sm">{result.hash}</div>
          {parsed && <HashAnatomy parsed={parsed} />}
        </div>
      )}
    </div>
  )
}

type VerifyState = 'idle' | 'invalid' | 'checking' | 'match' | 'nomatch'

function VerifyTab() {
  const t = useTranslations('BcryptGenerator')
  const [password, setPassword] = useState('')
  const [hashInput, setHashInput] = useState('')
  const [state, setState] = useState<VerifyState>('idle')
  const requestIdRef = useRef(0)

  useEffect(() => {
    const id = ++requestIdRef.current
    if (!password || !hashInput.trim()) {
      setState('idle')
      return
    }
    if (!parseBcryptHash(hashInput)) {
      setState('invalid')
      return
    }
    setState('checking')
    const timer = setTimeout(() => {
      void verifyPassword(password, hashInput).then((ok) => {
        if (requestIdRef.current === id) setState(ok ? 'match' : 'nomatch')
      })
    }, 350)
    return () => clearTimeout(timer)
  }, [password, hashInput])

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bcrypt-verify-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('verify.passwordLabel')}
        </Label>
        <PasswordInput
          id="bcrypt-verify-password"
          value={password}
          onChange={setPassword}
          placeholder={t('verify.passwordPlaceholder')}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bcrypt-verify-hash" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('verify.hashLabel')}
        </Label>
        <Input
          id="bcrypt-verify-hash"
          value={hashInput}
          onChange={(e) => setHashInput(e.target.value)}
          placeholder={t('verify.hashPlaceholder')}
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div role="status" aria-live="polite">
        {state === 'idle' && (
          <div className="rounded-md border border-border bg-[hsl(var(--surface-2))] px-3 py-2.5 text-sm text-muted-foreground">
            {t('verify.idle')}
          </div>
        )}
        {state === 'invalid' && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {t('verify.invalidHash')}
          </div>
        )}
        {state === 'checking' && (
          <div className="rounded-md border border-border bg-[hsl(var(--surface-2))] px-3 py-2.5 text-sm text-muted-foreground">
            {t('verify.checking')}
          </div>
        )}
        {state === 'match' && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="h-4 w-4 shrink-0" />
            {t('verify.match')}
          </div>
        )}
        {state === 'nomatch' && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-700 dark:text-red-400">
            <CircleX className="h-4 w-4 shrink-0" />
            {t('verify.noMatch')}
          </div>
        )}
      </div>
    </div>
  )
}

export function BcryptGeneratorLayout() {
  const t = useTranslations('BcryptGenerator')

  return (
    <ToolShell
      icon={IconShieldLock}
      title={t('title')}
      description={t('subtitle')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-5">
          <Tabs defaultValue="hash">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="hash">
                <KeyRound className="mr-1.5 h-4 w-4" />
                {t('tabs.hash')}
              </TabsTrigger>
              <TabsTrigger value="verify">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {t('tabs.verify')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="hash">
              <HashTab />
            </TabsContent>
            <TabsContent value="verify">
              <VerifyTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ToolShell>
  )
}
