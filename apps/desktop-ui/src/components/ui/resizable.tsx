"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

// v4 renamed `direction` -> `orientation`; keep the v3-style prop for call sites.
const ResizablePanelGroup = ({
    className,
    direction,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group> & {
    direction?: "horizontal" | "vertical"
}) => (
    <ResizablePrimitive.Group
        orientation={direction}
        className={cn("h-full w-full", className)}
        {...props}
    />
)

// v4 reads numeric sizes as pixels; call sites pass percentages (v3 semantics).
type Size = number | string | undefined
const pct = (v: Size) => (typeof v === "number" ? `${v}%` : v)

const ResizablePanel = ({
    defaultSize,
    minSize,
    maxSize,
    collapsedSize,
    order: _order,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel> & { order?: number }) => (
    <ResizablePrimitive.Panel
        defaultSize={pct(defaultSize)}
        minSize={pct(minSize)}
        maxSize={pct(maxSize)}
        collapsedSize={pct(collapsedSize)}
        {...props}
    />
)

// Separator in a vertical group has aria-orientation="horizontal".
const ResizableHandle = ({
    withHandle,
    className,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
    withHandle?: boolean
}) => (
    <ResizablePrimitive.Separator
        className={cn(
            "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
            className
        )}
        {...props}
    >
        {withHandle && (
            <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
                <GripVertical className="h-2.5 w-2.5" />
            </div>
        )}
    </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
