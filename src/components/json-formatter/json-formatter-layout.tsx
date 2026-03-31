'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconJson } from '@tabler/icons-react'
import type { Content, OnChangeStatus } from 'vanilla-jsoneditor'
import { Card, CardHeader } from '@/components/ui/card'
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

export function JsonFormatterLayout() {
  const t = useTranslations('JsonFormatter')
  const [content, setContent] = useState<Content>({
    json: initialJson,
  })

  const handleChange = (
    updatedContent: Content,
    _previousContent: Content,
    _status: OnChangeStatus
  ) => {
    setContent(updatedContent)
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3">
      <Card className="shrink-0 border shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-3 md:pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 shadow-sm transition-all hover:scale-105 hover:bg-primary/20">
              <IconJson className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
              {t('title')}
            </h1>
          </div>
        </CardHeader>
      </Card>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-0 flex-1 rounded-lg border"
      >
        {/* Left Pane - Text Mode */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <VanillaEditor
            mode="text"
            content={content}
            onChange={handleChange}
            mainMenuBar={true}
            navigationBar={true}
            statusBar={true}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Pane - Tree Mode */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <VanillaEditor
            mode="tree"
            content={content}
            onChange={handleChange}
            mainMenuBar={true}
            navigationBar={true}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
