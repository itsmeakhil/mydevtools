"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { KeyValueItem } from "./types"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/** 2rem checkbox · key · value · 2.25rem delete button (h-9 w-9). */
const ROW_GRID = "grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2"

interface KeyValueEditorProps {
    items: KeyValueItem[]
    onChange: (items: KeyValueItem[]) => void
}

export function KeyValueEditor({ items, onChange }: KeyValueEditorProps) {
    const t = useTranslations("ApiClient.keyValueEditor")
    const addItem = () => {
        onChange([
            ...items,
            { id: crypto.randomUUID(), key: "", value: "", active: true },
        ])
    }

    const updateItem = (id: string, field: keyof KeyValueItem, value: any) => {
        onChange(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        )
    }

    const deleteItem = (id: string) => {
        onChange(items.filter((item) => item.id !== id))
    }

    return (
        <div className="space-y-2">
            {/* Header and rows share one grid template — a flex header with no
                `gap` drifted out of line with the rows, which have one. */}
            <div className={cn(ROW_GRID, "text-xs font-medium uppercase tracking-wide text-muted-foreground")}>
                <div />
                {/* px-3 matches the Input's own padding so the label sits over its text */}
                <div className="px-3">{t("columnKey")}</div>
                <div className="px-3">{t("columnValue")}</div>
                <div />
            </div>
            {items.map((item) => (
                <div key={item.id} className={ROW_GRID}>
                    <div className="flex justify-center">
                        <Checkbox
                            checked={item.active}
                            onCheckedChange={(checked) =>
                                updateItem(item.id, "active", checked)
                            }
                        />
                    </div>
                    <Input
                        placeholder={t("placeholderKey")}
                        value={item.key}
                        onChange={(e) => updateItem(item.id, "key", e.target.value)}
                    />
                    <Input
                        placeholder={t("placeholderValue")}
                        value={item.value}
                        onChange={(e) => updateItem(item.id, "value", e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(item.id)}
                        className="size-9 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="mt-2"
            >
                <Plus className="h-4 w-4 mr-2" />
                {t("addItem")}
            </Button>
        </div>
    )
}
