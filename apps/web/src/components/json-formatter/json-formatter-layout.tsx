'use client'

import { useCallback, useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@/components/hooks/use-mobile'
import {
  IconCopy,
  IconDeviceFloppy,
  IconFilePlus,
  IconFolderOpen,
  IconJson,
  IconRefresh,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Mode, toTextContent, type Content, type OnChangeStatus } from 'vanilla-jsoneditor'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SendToMenu } from '@/components/ui/send-to-menu'
import useAuth from '@/utils/useAuth'
import { backendFetch } from '@/lib/backend-auth'
import { VanillaEditor } from './vanilla-editor'
import { useSearchParams } from 'next/navigation'
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
    const textContent = toTextContent(paneState.content)
    void copyToClipboard(textContent.text, {
      successMessage: pane === 'left' ? t('toastCopiedText') : t('toastCopiedTree'),
      errorMessage: t('toastCopyFailed'),
    })
  }

  const handleSave = async (pane: PaneKey) => {
    if (!user) {
      toast.error(t('toastLoginRequired'))
      return
    }

    const paneState = pane === 'left' ? leftPane : rightPane
    try {
      updatePane(pane, (prev) => ({ ...prev, isSaving: true }))
      const textContent = toTextContent(paneState.content)
      const body = {
        title: paneState.documentName,
        pane,
        content: textContent.text,
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

  const renderPaneToolbar = (pane: PaneKey) => {
    const state = pane === 'left' ? leftPane : rightPane
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-2.5 py-2">
        <input
          value={state.documentName}
          onChange={(event) => handlePaneNameChange(pane, event.target.value)}
          className="h-8 w-full sm:w-[170px] rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition-[color,border-color,box-shadow] duration-150 hover:border-border focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label={pane === 'left' ? t('leftDocNameLabel') : t('rightDocNameLabel')}
        />
        <Button variant="outline" size="sm" onClick={() => handleNewDocument(pane)}>
          <IconFilePlus className="mr-1.5 h-4 w-4" />
          {t('newDocument')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleCopy(pane)}>
          <IconCopy className="mr-1.5 h-4 w-4" />
          {t('copy')}
        </Button>
        <SendToMenu content={toTextContent(state.content).text} />
        <Button variant="outline" size="sm" onClick={() => openLoadDialog(pane)}>
          <IconFolderOpen className="mr-1.5 h-4 w-4" />
          {t.has('load') ? t('load') : 'Load'}
        </Button>
        <Button variant="gradient" size="sm" onClick={() => handleSave(pane)} disabled={state.isSaving}>
          <IconDeviceFloppy className="mr-1.5 h-4 w-4" />
          {state.isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <Card className="shrink-0 border shadow-lg bg-card/50 backdrop-blur-sm md:hidden">
        <CardHeader className="p-3 md:pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/10 p-2 text-primary shadow-sm ring-1 ring-inset ring-border/50 transition-all hover:scale-105">
                <IconJson className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                  {t('title')}
                </h1>
                <p className="text-xs text-muted-foreground md:text-sm">
                  {t('description')}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mobile tab switcher */}
      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setActivePane('left')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activePane === 'left'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setActivePane('right')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activePane === 'right'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tree
          </button>
        </div>
      )}

      {isMobile ? (
        /* Mobile: single full-height pane, toggled by tabs */
        <div className="min-h-0 flex-1 rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden flex flex-col">
          {renderPaneToolbar(activePane)}
          <div className="min-h-0 flex-1">
            {activePane === 'left' ? (
              <VanillaEditor
                mode={Mode.text}
                content={leftPane.content}
                onChange={(updated, previous, status) =>
                  handlePaneChange('left', updated, previous, status)
                }
                mainMenuBar={true}
                navigationBar={true}
                statusBar={true}
              />
            ) : (
              <VanillaEditor
                mode={Mode.tree}
                content={rightPane.content}
                onChange={(updated, previous, status) =>
                  handlePaneChange('right', updated, previous, status)
                }
                mainMenuBar={true}
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
                  mode={Mode.text}
                  content={leftPane.content}
                  onChange={(updated, previous, status) =>
                    handlePaneChange('left', updated, previous, status)
                  }
                  mainMenuBar={true}
                  navigationBar={true}
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
                  mode={Mode.tree}
                  content={rightPane.content}
                  onChange={(updated, previous, status) =>
                    handlePaneChange('right', updated, previous, status)
                  }
                  mainMenuBar={true}
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
  )
}
