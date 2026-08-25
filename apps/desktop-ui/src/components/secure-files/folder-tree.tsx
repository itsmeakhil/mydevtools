"use client"

import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { IconChevronRight, IconDots, IconFolder, IconFolderOpen, IconPencil, IconTrash } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToolSidebarPanel, useToolSidebarRail } from "@/components/tools/tool-sidebar"
import { cn } from "@/lib/utils"
import type { FolderNode } from "@/lib/secure-files"

type Actions = {
  onSelect: (path: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
}

function ancestors(path: string): string[] {
  const out: string[] = []
  let i = path.indexOf("/")
  while (i !== -1) {
    out.push(path.slice(0, i))
    i = path.indexOf("/", i + 1)
  }
  return out
}

export function FolderTree({ root, currentDir, ...actions }: { root: FolderNode; currentDir: string } & Actions) {
  const t = useTranslations("SecureFiles")
  const panel = useToolSidebarPanel()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestors(currentDir)))

  // Keep the selected folder visible when navigation happens from the main pane.
  useEffect(() => {
    const need = ancestors(currentDir)
    if (need.every((p) => expanded.has(p))) return
    setExpanded((prev) => new Set([...prev, ...need]))
  }, [currentDir, expanded])

  const toggle = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const select = React.useCallback(
    (path: string) => {
      actions.onSelect(path)
      // Only when the panel floats over the result. On desktop it is a pinned
      // column, and closing it collapsed the sidebar on every folder pick.
      if (panel?.isOverlay) panel.close()
    },
    [actions, panel],
  )

  // Top-level folders stay reachable from the collapsed rail.
  useToolSidebarRail(
    "folders",
    React.useMemo(
      () =>
        root.children.slice(0, 8).map((child) => ({
          id: child.path,
          label: child.name,
          icon: IconFolder,
          count: child.files.length,
          active: currentDir === child.path,
          onSelect: () => select(child.path),
        })),
      [root.children, currentDir, select],
    ),
  )

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <button
        type="button"
        onClick={() => select("")}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          currentDir === "" && "bg-muted font-medium",
        )}
      >
        <IconFolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{t("allFiles")}</span>
      </button>
      {root.children.map((child) => (
        <FolderRow
          key={child.path}
          node={child}
          depth={0}
          currentDir={currentDir}
          expanded={expanded}
          onToggle={toggle}
          onSelect={select}
          onRename={actions.onRename}
          onDelete={actions.onDelete}
        />
      ))}
    </div>
  )
}

type RowProps = {
  node: FolderNode
  depth: number
  currentDir: string
  expanded: Set<string>
  onToggle: (path: string) => void
} & Actions

const FolderRow = React.memo(function FolderRow({
  node,
  depth,
  currentDir,
  expanded,
  onToggle,
  onSelect,
  onRename,
  onDelete,
}: RowProps) {
  const t = useTranslations("SecureFiles")
  const open = expanded.has(node.path)
  const hasChildren = node.children.length > 0
  const active = currentDir === node.path

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm transition-colors hover:bg-muted",
          active && "bg-muted font-medium",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <button
          type="button"
          aria-label={open ? t("collapse") : t("expand")}
          onClick={() => onToggle(node.path)}
          className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
        >
          <IconChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        >
          <IconFolder className="size-4 shrink-0 text-amber-500" />
          <span className="truncate">{node.name}</span>
          {node.files.length > 0 && (
            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{node.files.length}</span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("actions")}
              className="size-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <IconDots className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(node.path)}>
              <IconPencil className="size-4" /> {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(node.path)} className="text-destructive focus:text-destructive">
              <IconTrash className="size-4" /> {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FolderRow
                key={child.path}
                node={child}
                depth={depth + 1}
                currentDir={currentDir}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
