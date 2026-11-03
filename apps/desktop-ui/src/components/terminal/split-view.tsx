"use client"

import * as React from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useTerminalStore, type TerminalTab } from "@/store/terminal-store"
import { leafIds, type SplitNode } from "@/lib/terminal/layout"
import { TerminalPane } from "./terminal-pane"
import { terminalLabel } from "./terminal-sidebar"

interface Ctx {
  tab: TerminalTab
  cwd: string
  projectName: string
  visible: boolean
}

/** Recursive split layout; `path` = child indices from the tab root (the store's `resize` contract). */
export function SplitView({ node, path, ctx }: { node: SplitNode; path: number[]; ctx: Ctx }) {
  const status = useTerminalStore((s) => (node.kind === "leaf" ? s.statuses[node.id] : undefined))
  const focused = useTerminalStore((s) => node.kind === "leaf" && s.focusedTerminalId === node.id)
  const titles = useTerminalStore((s) => s.titles)

  if (node.kind === "leaf") {
    return (
      <TerminalPane
        id={node.id}
        cwd={ctx.cwd}
        projectName={ctx.projectName}
        label={terminalLabel(ctx.tab, node.id, titles)}
        status={status}
        focused={focused}
        visible={ctx.visible}
      />
    )
  }

  // A subtree's first leaf id is stable and unique among siblings; the depth prefix keeps
  // it unique across nested groups (a nested group's first panel shares that leaf).
  const ids = node.children.map((c) => `${path.length}:${leafIds(c)[0]}`)
  return (
    <ResizablePanelGroup
      direction={node.dir === "row" ? "horizontal" : "vertical"}
      onLayoutChanged={(layout, meta) => {
        if (meta.isUserInteraction) useTerminalStore.getState().resize(ctx.tab.id, path, ids.map((id) => layout[id]))
      }}
    >
      {node.children.map((child, i) => (
        <React.Fragment key={ids[i]}>
          {i > 0 && <ResizableHandle />}
          <ResizablePanel id={ids[i]} defaultSize={node.sizes[i]} minSize={10}>
            <SplitView node={child} path={[...path, i]} ctx={ctx} />
          </ResizablePanel>
        </React.Fragment>
      ))}
    </ResizablePanelGroup>
  )
}
