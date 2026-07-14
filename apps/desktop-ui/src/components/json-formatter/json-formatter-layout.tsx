'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@/components/hooks/use-mobile'
import {
  IconArrowsMinimize,
  IconBraces,
  IconChevronDown,
  IconCopy,
  IconDeviceFloppy,
  IconFilePlus,
  IconFolderOpen,
  IconJson,
  IconRefresh,
  IconSortAscendingLetters,
  IconTransform,
  IconWand,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import type { Mode, Content, OnChangeStatus } from 'vanilla-jsoneditor'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { Button } from '@/components/ui/button'
import { SendToMenu } from '@/components/ui/send-to-menu'
import useAuth from '@/utils/useAuth'
import { backendFetch } from '@/lib/backend-auth'
import { repairJSON } from '@/lib/json-utils/repair'
import { sortKeysDeep } from '@/lib/json-utils/sort'
import { VanillaEditor, type VanillaEditorInstance } from './vanilla-editor'
import { useSearchParams } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal'
import { ScrollArea } from '@/components/ui/scroll-area'

// Local copy of vanilla-jsoneditor's toTextContent, kept out of the static import so the
// 485KB editor barrel isn't dragged into this route's initial chunk (editor loads lazily).
function contentToText(content: Content): string {
  if ('text' in content && content.text !== undefined) return content.text
  // vanilla-jsoneditor's toTextContent defaults to compact (no indentation) — match it.
  return JSON.stringify((content as { json: unknown }).json)
}

const initialJson = {
  array: [1, 2, 3],
  boolean: true,
  color: '#82b92c',
  null: null,
  number: 123,
  object: { a: 'b', c: 'd' },
  string: 'Hello World',
}

type PaneKey = 'left' | 'right'

interface PaneState {
  content: Content
  documentName: string
  documentId: string | null
  isSaving: boolean
  newDocumentCount: number
}

type JsonFormatterDocumentOut = {
  id: string
  title: string
  pane: PaneKey
  content: string
  createdAt: string
  updatedAt: string
}

const DOCS_PAGE_SIZE = 500

const createPaneState = (initialName: string): PaneState => ({
  content: { json: initialJson },
  documentName: initialName,
  documentId: null,
  isSaving: false,
  newDocumentCount: 1,
})

export function JsonFormatterLayout() {
  const t = useTranslations('JsonFormatter')
  const { user } = useAuth(false)
  const { copyToClipboard } = useCopyToClipboard()
  const searchParams = useSearchParams()
  const initialInputParam = searchParams.get('input')

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!user) throw new Error('Not authenticated')
      const res = await backendFetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Request failed (${res.status})`)
      }
      return res
    },
    [user]
  )
  const [leftPane, setLeftPane] = useState<PaneState>(() => {
    let content: Content = { json: initialJson };
    if (initialInputParam) {
      try {
        content = { json: JSON.parse(initialInputParam) };
      } catch {
        content = { text: initialInputParam };
      }
    }
    return {
      ...createPaneState(t('documentNameText', { n: 1 })),
      content,
    };
  })
  const [rightPane, setRightPane] = useState<PaneState>(() =>
    createPaneState(t('documentNameTree', { n: 1 }))
  )

  const isMobile = useIsMobile()
  const [activePane, setActivePane] = useState<PaneKey>('left')
  const [loadOpen, setLoadOpen] = useState(false)
  const [loadPane, setLoadPane] = useState<PaneKey>('left')
  const [docsLoading, setDocsLoading] = useState(false)
  const [docs, setDocs] = useState<JsonFormatterDocumentOut[]>([])

  const docsByPane = useMemo(() => {
    return {
      left: docs.filter((d) => d.pane === 'left'),
      right: docs.filter((d) => d.pane === 'right'),
    }
  }, [docs])

  const updatePane = (pane: PaneKey, updater: (prev: PaneState) => PaneState) => {
    if (pane === 'left') {
      setLeftPane(updater)
      return
    }
    setRightPane(updater)
  }

  const handlePaneChange = (
    pane: PaneKey,
    updatedContent: Content,
    _previousContent: Content,
    _status: OnChangeStatus
  ) => {
    updatePane(pane, (prev) => ({
      ...prev,
      content: updatedContent,
    }))
  }

  const handlePaneNameChange = (pane: PaneKey, name: string) => {
    updatePane(pane, (prev) => ({
      ...prev,
      documentName: name,
    }))
  }

  const handleNewDocument = (pane: PaneKey) => {
    updatePane(pane, (prev) => {
      const nextCount = prev.newDocumentCount + 1
      return {
        ...prev,
        content: { json: {} },
        documentName:
          pane === 'left'
            ? t('documentNameText', { n: nextCount })
            : t('documentNameTree', { n: nextCount }),
        documentId: null,
        newDocumentCount: nextCount,
      }
    })
  }

  const handleCopy = (pane: PaneKey) => {
    const paneState = pane === 'left' ? leftPane : rightPane
    const textContentText = contentToText(paneState.content)
    void copyToClipboard(textContentText, {
      successMessage: pane === 'left' ? t('toastCopiedText') : t('toastCopiedTree'),
      errorMessage: t('toastCopyFailed'),
    })
  }

  const editorRefs = useRef<Record<PaneKey, VanillaEditorInstance | null>>({
    left: null,
    right: null,
  })

  const parsePane = (pane: PaneKey): unknown | undefined => {
    const state = pane === 'left' ? leftPane : rightPane
    try {
      return JSON.parse(contentToText(state.content))
    } catch {
      toast.error(t('toastInvalidJson'))
      return undefined
    }
  }

  const handleFormat = (pane: PaneKey) => {
    const parsed = parsePane(pane)
    if (parsed === undefined) return
    updatePane(pane, (prev) => ({ ...prev, content: { text: JSON.stringify(parsed, null, 2) } }))
  }

  const handleCompact = (pane: PaneKey) => {
    const parsed = parsePane(pane)
    if (parsed === undefined) return
    updatePane(pane, (prev) => ({ ...prev, content: { text: JSON.stringify(parsed) } }))
  }

  const handleSortKeys = (pane: PaneKey) => {
    const parsed = parsePane(pane)
    if (parsed === undefined) return
    const sorted = sortKeysDeep(parsed)
    updatePane(pane, (prev) => ({
      ...prev,
      content:
        pane === 'left' ? { text: JSON.stringify(sorted, null, 2) } : { json: sorted },
    }))
  }

  const handleRepair = (pane: PaneKey) => {
    const state = pane === 'left' ? leftPane : rightPane
    try {
      const { repaired, wasRepaired, changes } = repairJSON(contentToText(state.content))
      if (!wasRepaired) {
        toast.message(t('toastAlreadyValid'))
        return
      }
      updatePane(pane, (prev) => ({ ...prev, content: { text: repaired } }))
      toast.success(`${t('toastRepaired')}: ${changes.join(', ')}`)
    } catch {
      toast.error(t('toastRepairFailed'))
    }
  }

  const handleQuery = (pane: PaneKey) => {
    editorRefs.current[pane]?.transform()
  }

  const handleSave = async (pane: PaneKey) => {
    if (!user) {
      toast.error(t('toastLoginRequired'))
      return
    }

    const paneState = pane === 'left' ? leftPane : rightPane
    try {
      updatePane(pane, (prev) => ({ ...prev, isSaving: true }))
      const textContentText = contentToText(paneState.content)
      const body = {
        title: paneState.documentName,
        pane,
        content: textContentText,
      }

      if (paneState.documentId) {
        const res = await authedFetch(
          `/api/backend/json-formatter/documents/${paneState.documentId}`,
          { method: 'PATCH', body: JSON.stringify(body) }
        )
        const saved = (await res.json()) as { id: string }
        updatePane(pane, (prev) => ({ ...prev, documentId: saved.id }))
      } else {
        const res = await authedFetch('/api/backend/json-formatter/documents', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        const saved = (await res.json()) as { id: string }
        updatePane(pane, (prev) => ({ ...prev, documentId: saved.id }))
      }

      toast.success(t('toastSaved'))
    } catch (error) {
      console.error('Failed to save JSON document:', error)
      toast.error(t('toastSaveFailed'))
    } finally {
      updatePane(pane, (prev) => ({ ...prev, isSaving: false }))
    }
  }

  const fetchDocuments = async () => {
    const allDocs = await fetchAllPages<JsonFormatterDocumentOut>({
      pageSize: DOCS_PAGE_SIZE,
      fetchPage: async (skip, limit) => {
        const res = await authedFetch(
          `/api/backend/json-formatter/documents?skip=${skip}&limit=${limit}`
        )
        return (await res.json()) as JsonFormatterDocumentOut[]
      },
    })

    setDocs(allDocs)
  }

  const openLoadDialog = async (pane: PaneKey) => {
    if (!user) {
      toast.error(t('toastLoginRequired'))
      return
    }
    setLoadPane(pane)
    setLoadOpen(true)
    setDocsLoading(true)
    try {
      await fetchDocuments()
    } catch (error) {
      console.error('Failed to list JSON documents:', error)
      toast.error('Failed to load saved documents')
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  const loadDocumentIntoPane = async (pane: PaneKey, docId: string) => {
    try {
      const res = await authedFetch(`/api/backend/json-formatter/documents/${docId}`)
      const doc = (await res.json()) as JsonFormatterDocumentOut
      const title = doc?.title || ''
      const contentText = doc?.content || ''

      let content: Content
      try {
        content = { json: JSON.parse(contentText) }
      } catch {
        content = { text: contentText }
      }

      updatePane(pane, (prev) => ({
        ...prev,
        content,
        documentName: title || prev.documentName,
        documentId: docId,
      }))
      toast.success('Loaded')
      setLoadOpen(false)
    } catch (error) {
      console.error('Failed to load JSON document:', error)
      toast.error('Failed to load saved document')
    }
  }

  const renderToolbarIconButton = (
    label: string,
    Icon: typeof IconBraces,
    onClick: () => void
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )

  const renderPaneToolbar = (pane: PaneKey) => {
    const state = pane === 'left' ? leftPane : rightPane
    const isTextPane = pane === 'left'
    return (
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/30 px-2 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 max-w-[180px] gap-1 px-2">
              <span className="truncate text-xs font-medium">{state.documentName}</span>
              <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <div className="px-2 py-1.5">
              <input
                value={state.documentName}
                onChange={(event) => handlePaneNameChange(pane, event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition-[color,border-color,box-shadow] duration-150 hover:border-border focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label={pane === 'left' ? t('leftDocNameLabel') : t('rightDocNameLabel')}
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleNewDocument(pane)}>
              <IconFilePlus className="mr-2 h-4 w-4" />
              {t('newDocument')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleSave(pane)} disabled={state.isSaving}>
              <IconDeviceFloppy className="mr-2 h-4 w-4" />
              {state.isSaving ? t('saving') : t('save')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openLoadDialog(pane)}>
              <IconFolderOpen className="mr-2 h-4 w-4" />
              {t.has('load') ? t('load') : 'Load'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        {isTextPane && (
          <>
            {renderToolbarIconButton(t('format'), IconBraces, () => handleFormat(pane))}
            {renderToolbarIconButton(t('compact'), IconArrowsMinimize, () => handleCompact(pane))}
            {renderToolbarIconButton(t('repair'), IconWand, () => handleRepair(pane))}
          </>
        )}
        {renderToolbarIconButton(t('sortKeys'), IconSortAscendingLetters, () =>
          handleSortKeys(pane)
        )}
        {renderToolbarIconButton(t('query'), IconTransform, () => handleQuery(pane))}

        <div className="ml-auto flex items-center gap-1">
          {renderToolbarIconButton(t('copy'), IconCopy, () => handleCopy(pane))}
          <SendToMenu content={contentToText(state.content)} className="h-8" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="gradient"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSave(pane)}
                disabled={state.isSaving}
                aria-label={state.isSaving ? t('saving') : t('save')}
              >
                <IconDeviceFloppy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{state.isSaving ? t('saving') : t('save')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader icon={IconJson} title={t('title')} description={t('description')} />
      </RevealItem>

      {isMobile && (
        <ToolMobileTabs
          value={activePane}
          onValueChange={setActivePane}
          tabs={[
            { value: 'left', label: 'Text' },
            { value: 'right', label: 'Tree' },
          ]}
        />
      )}

      {isMobile ? (
        /* Mobile: single full-height pane, toggled by tabs */
        <div className="min-h-0 flex-1 rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden flex flex-col">
          {renderPaneToolbar(activePane)}
          <div className="min-h-0 flex-1">
            {activePane === 'left' ? (
              <VanillaEditor
                mode={'text' as Mode}
                content={leftPane.content}
                onChange={(updated, previous, status) =>
                  handlePaneChange('left', updated, previous, status)
                }
                onEditorReady={(editor) => (editorRefs.current.left = editor)}
                mainMenuBar={false}
                navigationBar={false}
                statusBar={true}
              />
            ) : (
              <VanillaEditor
                mode={'tree' as Mode}
                content={rightPane.content}
                onChange={(updated, previous, status) =>
                  handlePaneChange('right', updated, previous, status)
                }
                onEditorReady={(editor) => (editorRefs.current.right = editor)}
                mainMenuBar={false}
                navigationBar={true}
              />
            )}
          </div>
        </div>
      ) : (
        /* Desktop: side-by-side resizable panes */
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-0 flex-1 rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden"
        >
          <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
            <div className="flex h-full min-h-0 flex-col">
              {renderPaneToolbar('left')}
              <div className="min-h-0 flex-1">
                <VanillaEditor
                  mode={'text' as Mode}
                  content={leftPane.content}
                  onChange={(updated, previous, status) =>
                    handlePaneChange('left', updated, previous, status)
                  }
                  onEditorReady={(editor) => (editorRefs.current.left = editor)}
                  mainMenuBar={false}
                  navigationBar={false}
                  statusBar={true}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
            <div className="flex h-full min-h-0 flex-col">
              {renderPaneToolbar('right')}
              <div className="min-h-0 flex-1">
                <VanillaEditor
                  mode={'tree' as Mode}
                  content={rightPane.content}
                  onChange={(updated, previous, status) =>
                    handlePaneChange('right', updated, previous, status)
                  }
                  onEditorReady={(editor) => (editorRefs.current.right = editor)}
                  mainMenuBar={false}
                  navigationBar={true}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ResponsiveModal open={loadOpen} onOpenChange={setLoadOpen}>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Load saved JSON</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Pick a previously saved JSON document from your account.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalBody>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs text-muted-foreground">
              Load into <span className="font-medium">{loadPane}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setDocsLoading(true)
                try {
                  await fetchDocuments()
                } finally {
                  setDocsLoading(false)
                }
              }}
              disabled={docsLoading}
            >
              <IconRefresh className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-[320px] rounded-md border">
            <div className="p-2">
              {docsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : docsByPane[loadPane].length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No saved documents yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {docsByPane[loadPane].map((d) => (
                    <button
                      key={d.id}
                      className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted transition-colors"
                      onClick={() => loadDocumentIntoPane(loadPane, d.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{d.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {d.updatedAt || d.createdAt}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {d.pane}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResponsiveModalBody>
      </ResponsiveModal>
    </div>
    </TooltipProvider>
  )
}
