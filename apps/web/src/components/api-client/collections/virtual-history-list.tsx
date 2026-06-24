"use client"
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { HistoryRequest } from "../types"

const ROW_HEIGHT = 64

interface VirtualHistoryListProps {
    items: HistoryRequest[]
    height: number
    onSelect: (item: HistoryRequest) => void
    onDelete: (id: string) => void
    renderRow: (item: HistoryRequest, style: React.CSSProperties) => React.ReactNode
}

export const VirtualHistoryList = React.memo(function VirtualHistoryList({
    items,
    height,
    renderRow,
}: VirtualHistoryListProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 5,
    })

    return (
        <div
            ref={scrollRef}
            role="list"
            style={{ height, overflow: "auto" }}
        >
            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                {virtualizer.getVirtualItems().map((row) => {
                    const item = items[row.index]
                    if (!item) return null
                    const style: React.CSSProperties = {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: row.size,
                        transform: `translateY(${row.start}px)`,
                    }
                    return (
                        <React.Fragment key={item.id ?? row.index}>
                            {renderRow(item, style)}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
})
