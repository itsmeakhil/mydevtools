'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  COMPOSE_SERVICE_DEFINITIONS,
  COMPOSE_SERVICE_ORDER,
  type ComposeCategory,
  buildDockerComposeYaml,
} from '@/lib/docker-compose-generator'
import { Check, Copy, Download, Search, X } from 'lucide-react'

const PRESETS: { id: string; services: string[] }[] = [
  { id: 'stackWeb', services: ['postgres', 'redis', 'nginx'] },
  { id: 'stackMern', services: ['mongodb', 'redis', 'nginx'] },
  { id: 'stackObserve', services: ['prometheus', 'grafana', 'loki'] },
  { id: 'stackMessaging', services: ['rabbitmq', 'redis'] },
  { id: 'stackSearch', services: ['meilisearch', 'postgres'] },
]

const CATEGORY_ORDER: ComposeCategory[] = [
  'databases',
  'cache',
  'queues',
  'search',
  'storage',
  'proxy',
  'observability',
  'mail',
  'admin',
]

export function DockerComposeGeneratorLayout() {
  const t = useTranslations('DockerComposeGenerator')
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [copied, setCopied] = React.useState(false)

  const selectedList = React.useMemo(
    () => COMPOSE_SERVICE_ORDER.filter((id) => selected.has(id)),
    [selected]
  )

  const yaml = React.useMemo(() => buildDockerComposeYaml(selectedList), [selectedList])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyPreset = (ids: string[]) => {
    setSelected(new Set(ids))
  }

  const clearAll = () => setSelected(new Set())

  const q = query.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!q) return COMPOSE_SERVICE_DEFINITIONS
    return COMPOSE_SERVICE_DEFINITIONS.filter((def) => {
      const label = t(`services.${def.id}`).toLowerCase()
      if (label.includes(q) || def.id.includes(q)) return true
      return def.search.some((tok) => tok.includes(q))
    })
  }, [q, t])

  const byCategory = React.useMemo(() => {
    const m = new Map<ComposeCategory, typeof filtered>()
    for (const c of CATEGORY_ORDER) m.set(c, [])
    for (const def of filtered) {
      const arr = m.get(def.category)
      if (arr) arr.push(def)
    }
    return m
  }, [filtered])

  const copyYaml = async () => {
    if (!yaml || selectedList.length === 0) return
    try {
      await navigator.clipboard.writeText(yaml)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const downloadYaml = () => {
    if (!yaml || selectedList.length === 0) return
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'docker-compose.yml'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 overflow-auto pb-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <Card className="p-4 flex flex-col gap-3 shrink-0">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => applyPreset(p.services)}
                >
                  {t(`presets.${p.id}`)}
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={clearAll}>
                {t('presets.clear')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('hintPorts')}</p>
          </Card>

          <Card className="p-4 flex flex-col flex-1 min-h-[280px] gap-3 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9 h-9"
                aria-label={t('searchPlaceholder')}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
              <span>{t('selectedLabel')}</span>
              <span>
                {t('selectedCount', { count: selected.size })}
              </span>
            </div>

            <ScrollArea className="flex-1 min-h-0 rounded-md border">
              <div className="p-3 space-y-5">
                {CATEGORY_ORDER.map((cat) => {
                  const items = byCategory.get(cat) ?? []
                  if (!items.length) return null
                  return (
                    <div key={cat}>
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">
                        {t(`categories.${cat}`)}
                      </div>
                      <div className="space-y-2">
                        {items.map((def) => {
                          const checked = selected.has(def.id)
                          return (
                            <label
                              key={def.id}
                              className={cn(
                                'flex items-start gap-3 rounded-md border border-transparent px-2 py-2 cursor-pointer hover:bg-muted/60',
                                checked && 'bg-muted/40 border-border'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(def.id)}
                                className="mt-0.5"
                                aria-label={t(`services.${def.id}`)}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="text-sm font-medium leading-tight block">
                                  {t(`services.${def.id}`)}
                                </span>
                                <code className="text-[10px] text-muted-foreground">{def.id}</code>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {selected.size > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1 border-t">
                {selectedList.map((id) => (
                  <Button
                    key={id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs gap-1 pr-1"
                    onClick={() => toggle(id)}
                  >
                    {id}
                    <X className="h-3 w-3 opacity-60" />
                  </Button>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <Card className="flex flex-col flex-1 p-4 overflow-hidden min-h-[320px]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t('outputTitle')}</Label>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 px-2"
                onClick={downloadYaml}
                disabled={selectedList.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('download')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 text-xs gap-1.5 px-2 transition-all',
                  copied && 'bg-green-600 hover:bg-green-600 text-white border-transparent'
                )}
                onClick={copyYaml}
                disabled={selectedList.length === 0}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? t('copied') : t('copy')}</span>
              </Button>
            </div>
          </div>
          <textarea
            readOnly
            value={yaml}
            placeholder={t('emptyState')}
            spellCheck={false}
            className="flex-1 min-h-0 w-full rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Card>
      </div>
    </div>
  )
}
