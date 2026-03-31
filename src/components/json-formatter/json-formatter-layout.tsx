'use client'

import { useState } from 'react'
import type { Content, OnChangeStatus } from 'vanilla-jsoneditor'
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
    <div className="flex h-full w-full flex-col">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg border">
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
