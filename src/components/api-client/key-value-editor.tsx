"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { KeyValueItem } from "./types"
import { useTranslations } from "next-intl"

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
            <div className="flex items-center font-medium text-sm text-muted-foreground mb-2">
                <div className="w-8 text-center"></div>
                <div className="flex-1 px-2">{t("columnKey")}</div>
                <div className="flex-1 px-2">{t("columnValue")}</div>
                <div className="w-10"></div>
            </div>
            {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                    <div className="w-8 flex justify-center">
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
                        className="flex-1"
                    />
                    <Input
                        placeholder={t("placeholderValue")}
                        value={item.value}
                        onChange={(e) => updateItem(item.id, "value", e.target.value)}
                        className="flex-1"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
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
