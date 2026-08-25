"use client"

import * as React from "react"
import { X, Plus, Copy, Plug, Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ApiRequestState } from "./types"
import { getApiClientRequestDisplayName } from "./display-name"
import { useTranslations } from "next-intl"

interface TabBarProps {
    tabs: ApiRequestState[]
    activeTabId: string
    onTabChange: (id: string) => void
    onTabClose: (id: string) => void
    onTabAdd: (kind?: "rest" | "websocket" | "grpc") => void
    onTabRename?: (id: string, name: string) => void
    onTabReorder?: (reordered: ApiRequestState[]) => void
    onTabDuplicate?: (id: string) => void
}

const getMethodColor = (method: string) => {
    switch (method) {
        case "GET": return "text-sky-500"
        case "POST": return "text-emerald-500"
        case "PUT": return "text-amber-500"
        case "DELETE": return "text-rose-500"
        case "PATCH": return "text-yellow-500"
        default: return "text-muted-foreground"
    }
}

export function TabBar({
    tabs,
    activeTabId,
    onTabChange,
    onTabClose,
    onTabAdd,
    onTabRename,
    onTabReorder,
    onTabDuplicate,
}: TabBarProps) {
    const t = useTranslations("ApiClient")
    const tTab = useTranslations("ApiClient.tabBar")

    const [editingTabId, setEditingTabId] = React.useState<string | null>(null)
    const [editValue, setEditValue] = React.useState("")
    const editInputRef = React.useRef<HTMLInputElement>(null)

    const [draggedId, setDraggedId] = React.useState<string | null>(null)
    const [dragOverId, setDragOverId] = React.useState<string | null>(null)

    // Refs for measuring active-tab indicator position
    const tabListRef = React.useRef<HTMLDivElement>(null)
    const tabRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
    const [indicatorStyle, setIndicatorStyle] = React.useState<{ left: number; width: number } | null>(null)

    // Only what changes a tab's width — not the whole tabs array, which is a new
    // reference on every keystroke in any request field.
    const tabsLayoutKey = tabs.map((t) => `${t.id}:${t.kind}:${t.method}:${t.name}`).join("|")

    // Measure the active tab and update the indicator synchronously before paint
    React.useLayoutEffect(() => {
        const activeEl = tabRefs.current[activeTabId]
        const listEl = tabListRef.current
        if (!activeEl || !listEl) {
            setIndicatorStyle(null)
            return
        }
        const tabRect = activeEl.getBoundingClientRect()
        const listRect = listEl.getBoundingClientRect()
        setIndicatorStyle({
            left: tabRect.left - listRect.left,
            width: tabRect.width,
        })
    }, [activeTabId, tabsLayoutKey])

    const handleDoubleClick = (tab: ApiRequestState) => {
        if (!onTabRename) return
        setEditingTabId(tab.id)
        setEditValue(getApiClientRequestDisplayName(tab.name, t))
        setTimeout(() => editInputRef.current?.select(), 0)
    }

    const commitRename = () => {
        if (editingTabId && editValue.trim() && onTabRename) {
            onTabRename(editingTabId, editValue.trim())
        }
        setEditingTabId(null)
    }

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (id !== draggedId) setDragOverId(id)
    }

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggedId || draggedId === targetId || !onTabReorder) return

        const from = tabs.findIndex((t) => t.id === draggedId)
        const to = tabs.findIndex((t) => t.id === targetId)
        if (from === -1 || to === -1) return

        const reordered = [...tabs]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(to, 0, moved)
        onTabReorder(reordered)
        setDraggedId(null)
        setDragOverId(null)
    }

    const handleDragEnd = () => {
        setDraggedId(null)
        setDragOverId(null)
    }

    return (
        <div className="flex items-center border-b bg-muted/30 backdrop-blur-sm h-11">
            <TooltipProvider delayDuration={500}>
            <ScrollArea className="flex-initial min-w-0 h-full">
                {/* relative container so the sliding indicator is positioned within it */}
                <div ref={tabListRef} className="relative flex w-max items-center h-full px-1">
                    {/* Sliding active-tab background + underline indicator */}
                    {indicatorStyle && (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-0.5 bottom-0.5 bg-background rounded-md shadow-sm -z-0 transition-all duration-200"
                            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                        />
                    )}
                    {/* Sliding underline indicator */}
                    {indicatorStyle && (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-0 h-0.5 bg-primary rounded-full -z-0 transition-all duration-200"
                            style={{
                                left: indicatorStyle.left + 8,
                                width: Math.max(0, indicatorStyle.width - 16),
                            }}
                        />
                    )}

                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            ref={(el) => { tabRefs.current[tab.id] = el }}
                            draggable={!!onTabReorder}
                            onDragStart={(e) => handleDragStart(e, tab.id)}
                            onDragOver={(e) => handleDragOver(e, tab.id)}
                            onDrop={(e) => handleDrop(e, tab.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer select-none min-w-[140px] max-w-[220px] h-[34px] rounded-md transition-colors m-0.5",
                                activeTabId === tab.id
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                dragOverId === tab.id && draggedId !== tab.id && "ring-2 ring-primary/50 ring-inset",
                                draggedId === tab.id && "opacity-50"
                            )}
                            onClick={() => {
                                if (editingTabId !== tab.id) onTabChange(tab.id)
                            }}
                            onDoubleClick={() => handleDoubleClick(tab)}
                        >
                            <span className={cn(
                                "text-[10px] font-black uppercase w-8 flex-shrink-0 tracking-tighter",
                                tab.kind === "websocket" ? "text-purple-500" : tab.kind === "grpc" ? "text-cyan-500" : getMethodColor(tab.method),
                            )}>
                                {tab.kind === "websocket" ? "WS" : tab.kind === "grpc" ? "RPC" : tab.method}
                            </span>

                            {editingTabId === tab.id ? (
                                <input
                                    ref={editInputRef}
                                    className="flex-1 text-xs bg-transparent border-b border-primary outline-none min-w-0 text-foreground"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitRename}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") commitRename()
                                        if (e.key === "Escape") setEditingTabId(null)
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate flex-1 text-xs">
                                            {getApiClientRequestDisplayName(tab.name, t)}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {getApiClientRequestDisplayName(tab.name, t)}
                                    </TooltipContent>
                                </Tooltip>
                            )}

                            {onTabDuplicate && (
                                <button
                                    className="flex items-center justify-center h-4 w-4 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onTabDuplicate(tab.id)
                                    }}
                                    title="Duplicate tab"
                                >
                                    <Copy className="h-2.5 w-2.5" />
                                </button>
                            )}
                            <button
                                className={cn(
                                    "flex items-center justify-center h-4 w-4 rounded-full transition-all",
                                    activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                    "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onTabClose(tab.id)
                                }}
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5 invisible" />
            </ScrollArea>
            </TooltipProvider>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mx-1 rounded-md hover:bg-muted/60 shrink-0"
                        aria-label={tTab("addTabAria")}
                        title={tTab("addTabAria")}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onSelect={() => onTabAdd("rest")}>
                        <Plus className="h-4 w-4 mr-2" />
                        New REST request
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onTabAdd("websocket")}>
                        <Plug className="h-4 w-4 mr-2" />
                        New WebSocket
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onTabAdd("grpc")}>
                        <Boxes className="h-4 w-4 mr-2" />
                        New gRPC-Web
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
