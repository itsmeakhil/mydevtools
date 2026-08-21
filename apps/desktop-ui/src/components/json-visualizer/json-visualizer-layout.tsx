'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Crosshair,
  Download,
  Maximize,
  Route,
  Search,
  Table2,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { IconChartDots3 } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { IOPanel, ToolTextArea } from '@/components/tools/io-panel'
import { GraphCanvas, type GraphCanvasHandle } from '@/components/json-visualizer/graph-canvas'
import { NodeTableDialog } from '@/components/json-visualizer/node-table-dialog'
import {
  ancestorIds,
  jsonToGraph,
  searchGraph,
  tableFromValue,
  HARD_NODE_CAP,
  type JsonGraph,
} from '@/lib/json-visualizer'

const SAMPLE = `{
  "product": "mydevtools",
  "version": 2,
  "openSource": true,
  "maintainer": { "name": "Akhil", "location": "Earth" },
  "features": ["graph view", "search", "export"],
  "tools": [
    { "name": "JSON Formatter", "category": "Formatters", "local": true },
    { "name": "JSON Visualizer", "category": "Formatters", "local": true },
    { "name": "API Client", "category": "Network & API", "local": false }
  ]
}`

export function JsonVisualizerLayout() {
  const t = useTranslations('JsonVisualizer')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { copyToClipboard } = useCopyToClipboard()
  const canvasRef = useRef<GraphCanvasHandle>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [input, setInput] = useState('')
  const [parsedText, setParsedText] = useState('')
  const [graph, setGraph] = useState<JsonGraph | null>(null)
  const [error, setError] = useState('')
  const [tooLarge, setTooLarge] = useState<number | null>(null)
  const [largeNotice, setLargeNotice] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeHit, setActiveHit] = useState(0)
  const [tableOpen, setTableOpen] = useState(false)

  // Debounced parse — all state updates happen inside the timer callback
  useEffect(() => {
    const timer = setTimeout(() => {
      setParsedText(input)
      setActiveHit(0)
      if (!input.trim()) {
        setGraph(null)
        setError('')
        setTooLarge(null)
        setLargeNotice(false)
        setSelectedId(null)
        return
      }
      const result = jsonToGraph(input)
      if (result.ok) {
        setGraph(result.graph)
        setError('')
        setTooLarge(null)
        setLargeNotice(result.collapseByDefault)
        setSelectedId(null)
        setCollapsedIds(
          result.collapseByDefault
            ? new Set(
                result.graph.nodes
                  .filter((n) => n.depth >= 1 && n.childIds.length > 0)
                  .map((n) => n.id),
              )
            : new Set(),
        )
      } else if (result.tooLarge) {
        setGraph(null)
        setError('')
        setTooLarge(result.nodeCount ?? HARD_NODE_CAP)
      } else {
        // keep the last valid graph visible; just surface the parse error
        setError(result.error)
        setTooLarge(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [input])

  const hits = useMemo(() => (graph ? searchGraph(graph, query) : []), [graph, query])
  const hitSet = useMemo(() => new Set(hits), [hits])
  const activeHitId = hits.length > 0 ? hits[Math.min(activeHit, hits.length - 1)] : null

  /** Expands the path to a node and pans the canvas to it. */
  const navigateTo = useCallback(
    (id: string) => {
      if (!graph) return
      setCollapsedIds((prev) => {
        const ancestors = ancestorIds(graph, id)
        if (!ancestors.some((a) => prev.has(a))) return prev
        const next = new Set(prev)
        ancestors.forEach((a) => next.delete(a))
        return next
      })
      // wait for the expanded layout to commit before centering
      requestAnimationFrame(() => requestAnimationFrame(() => canvasRef.current?.centerOn(id)))
    },
    [graph],
  )

  const goToHit = useCallback(
    (index: number) => {
      if (hits.length === 0) return
      const idx = (index + hits.length) % hits.length
      setActiveHit(idx)
      navigateTo(hits[idx])
    },
    [hits, navigateTo],
  )

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      setActiveHit(0)
      if (!value.trim() || !graph) return
      const newHits = searchGraph(graph, value)
      if (newHits.length > 0) navigateTo(newHits[0])
    },
    [graph, navigateTo],
  )

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    if (!graph) return
    setCollapsedIds(
      new Set(graph.nodes.filter((n) => n.depth >= 1 && n.childIds.length > 0).map((n) => n.id)),
    )
  }, [graph])

  const selectedNode = useMemo(
    () => (graph && selectedId !== null ? graph.nodes.find((n) => n.id === selectedId) ?? null : null),
    [graph, selectedId],
  )
  const selectedTable = useMemo(
    () => (selectedNode ? tableFromValue(selectedNode.value) : null),
    [selectedNode],
  )

  const locateInText = useCallback(() => {
    const node = selectedNode
    const textarea = textareaRef.current
    if (!node?.span || !textarea) return
    textarea.focus()
    textarea.setSelectionRange(node.span.start, node.span.end)
    const lineHeight = 20
    const line = parsedText.slice(0, node.span.start).split('\n').length - 1
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3)
  }, [selectedNode, parsedText])

  const editorPane = (
    <IOPanel
      label={t('panels.input')}
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setInput(SAMPLE)}>
            {t('sample')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setInput('')}
            disabled={!input}
            title={t('clear')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    >
      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <ToolTextArea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
        />
      </div>
    </IOPanel>
  )

  const graphPane = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-[hsl(var(--surface-2))] px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goToHit(activeHit + (e.shiftKey ? -1 : 1))
            }}
            placeholder={t('searchPlaceholder')}
            className="h-8 w-[170px] pl-7 text-xs"
            aria-label={t('searchPlaceholder')}
          />
        </div>
        {query && (
          <>
            <span className="font-mono text-[11px] text-muted-foreground">
              {hits.length === 0 ? '0/0' : `${(activeHit % hits.length) + 1}/${hits.length}`}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!hits.length} onClick={() => goToHit(activeHit - 1)} title={t('prevMatch')}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!hits.length} onClick={() => goToHit(activeHit + 1)} title={t('nextMatch')}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {graph && (
            <span className="mr-1 hidden font-mono text-[11px] text-muted-foreground sm:inline">
              {t('nodeCount', { count: graph.nodeCount })}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.zoomBy(1.25)} title={t('zoomIn')}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.zoomBy(0.8)} title={t('zoomOut')}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.fitView()} title={t('fitView')}>
            <Maximize className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsedIds(new Set())} disabled={!graph} title={t('expandAll')}>
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={collapseAll} disabled={!graph} title={t('collapseAll')}>
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" disabled={!graph}>
                <Download className="mr-1 h-3.5 w-3.5" />
                {t('export')}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void canvasRef.current?.exportImage('png', 'json-graph')}>
                {t('exportPng')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void canvasRef.current?.exportImage('svg', 'json-graph')}>
                {t('exportSvg')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {largeNotice && graph && (
        <div className="border-b border-border/50 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
          {t('largeDocNotice', { count: graph.nodeCount })}
        </div>
      )}

      <div className="dashboard-grid-bg relative min-h-0 flex-1">
        {graph ? (
          <GraphCanvas
            ref={canvasRef}
            graph={graph}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapse}
            selectedId={selectedId}
            onSelect={setSelectedId}
            searchHits={hitSet}
            activeHitId={query ? activeHitId : null}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {tooLarge !== null
              ? t('tooLarge', { cap: HARD_NODE_CAP.toLocaleString() })
              : t('emptyState')}
          </div>
        )}

        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 z-10 sm:right-auto sm:max-w-[420px]">
            <Card className="flex flex-col gap-2 border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2">
                <Route className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <code className="truncate font-mono text-xs" title={selectedNode.path}>
                  {selectedNode.path}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => void copyToClipboard(selectedNode.path, { successMessage: t('pathCopied') })}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {t('copyPath')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    void copyToClipboard(JSON.stringify(selectedNode.value, null, 2), {
                      successMessage: t('valueCopied'),
                    })
                  }
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {t('copyValue')}
                </Button>
                {selectedTable && (
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => setTableOpen(true)}>
                    <Table2 className="mr-1 h-3 w-3" />
                    {t('viewTable')}
                  </Button>
                )}
                {selectedNode.span && isDesktop && (
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={locateInText}>
                    <Crosshair className="mr-1 h-3 w-3" />
                    {t('locateInText')}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <ToolShell icon={IconChartDots3} title={t('title')} description={t('subtitle')}>
      <div className="min-h-0 flex-1">
        {isDesktop ? (
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 gap-0">
            <ResizablePanel defaultSize={34} minSize={20}>
              {editorPane}
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-1.5 bg-transparent" />
            <ResizablePanel defaultSize={66} minSize={30}>
              {graphPane}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Tabs defaultValue="input" className="flex h-full min-h-0 flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">{t('panels.input')}</TabsTrigger>
              <TabsTrigger value="graph">{t('panels.graph')}</TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
              {editorPane}
            </TabsContent>
            <TabsContent value="graph" className="min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
              {graphPane}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {selectedNode && (
        <NodeTableDialog
          open={tableOpen}
          onOpenChange={setTableOpen}
          path={selectedNode.path}
          table={selectedTable}
          title={t('tableTitle')}
        />
      )}
    </ToolShell>
  )
}
