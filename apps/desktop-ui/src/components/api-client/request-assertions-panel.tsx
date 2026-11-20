"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ASSERTION_OPERATORS, UNARY_OPERATORS, type Assertion, type AssertionOperator } from "@/lib/api-client/assertions"

/** checkbox · target · operator · value · delete */
const ROW_GRID = "grid grid-cols-[2rem_minmax(0,1fr)_9rem_minmax(0,1fr)_2rem] items-center gap-2"

/** Enabled rows with a target — drives the tab badge. */
export function countAssertions(assertions: Assertion[] | undefined): number {
    return (assertions ?? []).filter((a) => a.enabled && a.target.trim()).length
}

interface RequestAssertionsPanelProps {
    assertions: Assertion[] | undefined
    onChange: (next: Assertion[]) => void
}

export function RequestAssertionsPanel({ assertions = [], onChange }: RequestAssertionsPanelProps) {
    const t = useTranslations("ApiClient.assertions")
    const update = (id: string, patch: Partial<Assertion>) =>
        onChange(assertions.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    const add = () =>
        onChange([...assertions, { id: crypto.randomUUID(), enabled: true, target: "res.status", operator: "eq", value: "200" }])

    return (
        <div className="space-y-1.5">
            {assertions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
                <div className={cn(ROW_GRID, "text-[12px] font-medium text-muted-foreground")}>
                    <div />
                    <div className="px-3">{t("columnTarget")}</div>
                    <div className="px-3">{t("columnOperator")}</div>
                    <div className="px-3">{t("columnValue")}</div>
                    <div />
                </div>
            )}
            {assertions.map((a) => {
                const unary = UNARY_OPERATORS.has(a.operator)
                return (
                    <div key={a.id} className={ROW_GRID}>
                        <div className="flex justify-center">
                            <Checkbox
                                checked={a.enabled}
                                aria-label={t("enableAria")}
                                onCheckedChange={(checked) => update(a.id, { enabled: checked === true })}
                            />
                        </div>
                        <Input
                            value={a.target}
                            placeholder="res.body.id"
                            aria-label={t("columnTarget")}
                            onChange={(e) => update(a.id, { target: e.target.value })}
                            className="h-8 font-mono text-[13px]"
                        />
                        <Select value={a.operator} onValueChange={(op) => update(a.id, { operator: op as AssertionOperator })}>
                            <SelectTrigger aria-label={t("columnOperator")} className="h-8 font-mono text-[13px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSERTION_OPERATORS.map((op) => (
                                    <SelectItem key={op} value={op} className="font-mono text-[13px]">{op}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            value={unary ? "" : a.value}
                            disabled={unary}
                            placeholder={unary ? "" : t("placeholderValue")}
                            aria-label={t("columnValue")}
                            onChange={(e) => update(a.id, { value: e.target.value })}
                            className="h-8 font-mono text-[13px]"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("removeAria")}
                            onClick={() => onChange(assertions.filter((x) => x.id !== a.id))}
                            className="size-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            })}
            <Button variant="outline" size="sm" onClick={add} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                {t("add")}
            </Button>
        </div>
    )
}
