import * as React from "react"
import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"

export function Checkbox({
    checked, indeterminate, onToggle, className, ariaLabel,
}: {
    checked: boolean; indeterminate?: boolean; onToggle: () => void; className?: string; ariaLabel?: string
}) {
    return (
        <div
            data-sel-cb
            role="checkbox"
            tabIndex={0}
            aria-checked={indeterminate ? "mixed" : checked}
            aria-label={ariaLabel ?? (checked ? "Deselect item" : "Select item")}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle() } }}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={cn(
                "size-4 rounded-[5px] border flex items-center justify-center cursor-default shrink-0 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                checked || indeterminate
                    ? "bg-primary border-primary"
                    : "border-input bg-card hover:border-primary/60",
                className,
            )}
        >
            {indeterminate && !checked
                ? <div className="w-2 h-[2px] bg-primary-foreground rounded-full" />
                : checked
                    ? <IconCheck className="size-[11px] text-primary-foreground stroke-[3]" />
                    : null
            }
        </div>
    )
}

export function isCheckboxClick(e: React.MouseEvent) {
    return !!(e.target as HTMLElement).closest("[data-sel-cb]")
}
