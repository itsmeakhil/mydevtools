"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ApiRequestState } from "./types"
import { motion, AnimatePresence } from "framer-motion"

interface TabBarProps {
    tabs: ApiRequestState[]
    activeTabId: string
    onTabChange: (id: string) => void
    onTabClose: (id: string) => void
    onTabAdd: () => void
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
}: TabBarProps) {
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
                                className={cn(
                                    "group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer select-none min-w-[140px] max-w-[220px] h-[34px] rounded-md transition-colors m-0.5",
                                    activeTabId === tab.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                                onClick={() => onTabChange(tab.id)}
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

                                <span className="truncate flex-1 text-xs">
                                    {tab.name || "Untitled Request"}
                                </span>

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
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    )
}
