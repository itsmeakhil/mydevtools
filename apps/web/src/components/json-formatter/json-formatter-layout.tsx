'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconCopy, IconDeviceFloppy, IconFilePlus, IconJson } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Mode, toTextContent, type Content, type OnChangeStatus } from 'vanilla-jsoneditor'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import useAuth from '@/utils/useAuth'
import { backendFetch } from '@/lib/backend-auth'
import { VanillaEditor } from './vanilla-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

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
  const [leftPane, setLeftPane] = useState<PaneState>(() =>
    createPaneState(t('documentNameText', { n: 1 }))
  )
  const [rightPane, setRightPane] = useState<PaneState>(() =>
    createPaneState(t('documentNameTree', { n: 1 }))
  )

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

  const handleCopy = async (pane: PaneKey) => {
    const paneState = pane === 'left' ? leftPane : rightPane
    try {
      const textContent = toTextContent(paneState.content)
      await navigator.clipboard.writeText(textContent.text)
      toast.success(
        pane === 'left' ? t('toastCopiedText') : t('toastCopiedTree')
      )
    } catch (error) {
      console.error('Failed to copy JSON:', error)
      toast.error(t('toastCopyFailed'))
    }
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <Card className="shrink-0 border shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-3 md:pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2 shadow-sm transition-all hover:scale-105 hover:bg-primary/20">
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

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-0 flex-1 rounded-lg border overflow-hidden"
      >
        {/* Left Pane - Text Mode */}
        <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b p-2">
              <input
                value={leftPane.documentName}
                onChange={(event) => handlePaneNameChange('left', event.target.value)}
                className="h-8 w-[170px] rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t('leftDocNameLabel')}
              />
              <Button variant="outline" size="sm" onClick={() => handleNewDocument('left')}>
                <IconFilePlus className="mr-1.5 h-4 w-4" />
                {t('newDocument')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCopy('left')}>
                <IconCopy className="mr-1.5 h-4 w-4" />
                {t('copy')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('left')}
                disabled={leftPane.isSaving}
              >
                <IconDeviceFloppy className="mr-1.5 h-4 w-4" />
                {leftPane.isSaving ? t('saving') : t('save')}
              </Button>
            </div>
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

        {/* Right Pane - Tree Mode */}
        <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b p-2">
              <input
                value={rightPane.documentName}
                onChange={(event) => handlePaneNameChange('right', event.target.value)}
                className="h-8 w-[170px] rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t('rightDocNameLabel')}
              />
              <Button variant="outline" size="sm" onClick={() => handleNewDocument('right')}>
                <IconFilePlus className="mr-1.5 h-4 w-4" />
                {t('newDocument')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCopy('right')}>
                <IconCopy className="mr-1.5 h-4 w-4" />
                {t('copy')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('right')}
                disabled={rightPane.isSaving}
              >
                <IconDeviceFloppy className="mr-1.5 h-4 w-4" />
                {rightPane.isSaving ? t('saving') : t('save')}
              </Button>
            </div>
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
    </div>
  )
}
