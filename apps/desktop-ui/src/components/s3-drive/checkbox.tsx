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
                "size-[18px] rounded-[4px] border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-100",
                checked || indeterminate
                    ? "bg-blue-600 border-blue-600"
                    : "border-slate-400/60 bg-white/70 dark:bg-black/30 hover:border-blue-500",
                className,
            )}
        >
            {indeterminate && !checked
                ? <div className="w-2.5 h-[2px] bg-white rounded-full" />
                : checked
                    ? <IconCheck className="size-[11px] text-white stroke-[3]" />
                    : null
            }
        </div>
    )
}

export function isCheckboxClick(e: React.MouseEvent) {
    return !!(e.target as HTMLElement).closest("[data-sel-cb]")
}
