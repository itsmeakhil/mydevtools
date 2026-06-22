"use client"
import * as React from "react"
import { List } from "react-window"
import type { HistoryRequest } from "../types"

// Custom data passed through rowProps (must not include ariaAttributes, index, or style)
type HistoryRowCustomProps = {
    items: HistoryRequest[]
    renderRow: (item: HistoryRequest, style: React.CSSProperties) => React.ReactNode
}

// Full props received by the row component (custom data + injected by react-window)
type HistoryRowProps = HistoryRowCustomProps & {
    ariaAttributes: {
        "aria-posinset": number
        "aria-setsize": number
        role: "listitem"
    }
    index: number
    style: React.CSSProperties
}

function HistoryRow({ index, style, items, renderRow }: HistoryRowProps): React.ReactElement | null {
    const item = items[index]
    if (!item) return null
    return <>{renderRow(item, style)}</>
}

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
    const rowProps: HistoryRowCustomProps = { items, renderRow }
    return (
        <List<HistoryRowCustomProps>
            rowComponent={HistoryRow}
            rowProps={rowProps}
            rowCount={items.length}
            rowHeight={64}
            style={{ height }}
            defaultHeight={height}
        />
    )
})
