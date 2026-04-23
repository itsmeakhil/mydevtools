"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ApiRequestState } from "./types"
import { getApiClientRequestDisplayName } from "./display-name"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

interface TabBarProps {
    tabs: ApiRequestState[]
    activeTabId: string
    onTabChange: (id: string) => void
    onTabClose: (id: string) => void
    onTabAdd: () => void
    onTabRename?: (id: string, name: string) => void
    onTabReorder?: (reordered: ApiRequestState[]) => void
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
}: TabBarProps) {
    const t = useTranslations("ApiClient")
    const tTab = useTranslations("ApiClient.tabBar")

    const [editingTabId, setEditingTabId] = React.useState<string | null>(null)
    const [editValue, setEditValue] = React.useState("")
    const editInputRef = React.useRef<HTMLInputElement>(null)

    const [draggedId, setDraggedId] = React.useState<string | null>(null)
    const [dragOverId, setDragOverId] = React.useState<string | null>(null)

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
            <ScrollArea className="flex-initial min-w-0 h-full">
                <div className="flex w-max items-center h-full px-1">
                    <AnimatePresence initial={false} mode="popLayout">
                        {tabs.map((tab) => (
                            <motion.div
                                key={tab.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                draggable={!!onTabReorder}
                                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, tab.id)}
                                onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, tab.id)}
                                onDrop={(e) => handleDrop(e as unknown as React.DragEvent, tab.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer select-none min-w-[140px] max-w-[220px] h-[34px] rounded-md transition-colors m-0.5",
                                    activeTabId === tab.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                    dragOverId === tab.id && draggedId !== tab.id && "ring-2 ring-primary/50 ring-inset",
                                    draggedId === tab.id && "opacity-50"
                                )}
                                onClick={() => {
                                    if (editingTabId !== tab.id) onTabChange(tab.id)
                                }}
                                onDoubleClick={() => handleDoubleClick(tab)}
                            >
                                {activeTabId === tab.id && (
                                    <motion.div
                                        layoutId="active-tab"
                                        className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <span className={cn(
                                    "text-[10px] font-black uppercase w-8 flex-shrink-0 tracking-tighter",
                                    getMethodColor(tab.method)
                                )}>
                                    {tab.method}
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
                                    <span className="truncate flex-1 text-xs">
                                        {getApiClientRequestDisplayName(tab.name, t)}
                                    </span>
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

                                {activeTabId === tab.id && (
                                    <motion.div
                                        layoutId="active-underline"
                                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5 invisible" />
            </ScrollArea>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mx-1 rounded-md hover:bg-muted/60 shrink-0"
                onClick={onTabAdd}
                aria-label={tTab("addTabAria")}
                title={tTab("addTabAria")}
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    )
}
