"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JsonTree } from "./json-tree";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
    IconPlus, IconTrash, IconArrowUp, IconArrowDown,
    IconPlayerPlay, IconLoader2, IconAlertCircle,
} from "@tabler/icons-react";

import {
    PipelineStage, STAGE_TYPES, STAGE_TEMPLATES, newStage, stagesToPipeline,
} from "@/lib/nosql-pipeline";

export type { PipelineStage };
export { newStage, stagesToPipeline };
export { parsePipeline } from "@/lib/nosql-pipeline";

interface PipelineBuilderProps {
    stages: PipelineStage[];
    onChange: (stages: PipelineStage[]) => void;
    onPreview?: (pipelineJson: string) => Promise<{ documents: unknown[] }>;
}

export function PipelineBuilder({ stages, onChange, onPreview }: PipelineBuilderProps) {
    const t = useTranslations("NoSqlExplorer.pipeline");
    const [preview, setPreview] = useState<{ stageId: string; docs: unknown[] } | null>(null);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const update = (id: string, patch: Partial<PipelineStage>) =>
        onChange(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const remove = (id: string) => {
        onChange(stages.filter((s) => s.id !== id));
        if (preview?.stageId === id) setPreview(null);
    };

    const move = (index: number, dir: -1 | 1) => {
        const next = [...stages];
        const [s] = next.splice(index, 1);
        next.splice(index + dir, 0, s);
        onChange(next);
    };

    const runPreview = async (index: number) => {
        if (!onPreview) return;
        const stage = stages[index];
        setPreviewError(null);
        setPreviewLoading(stage.id);
        try {
            const pipeline = stagesToPipeline(stages, index);
            const res = await onPreview(pipeline);
            setPreview({ stageId: stage.id, docs: res.documents ?? [] });
        } catch (e: unknown) {
            setPreview(null);
            setPreviewError(e instanceof Error ? e.message : t("previewFail"));
        } finally {
            setPreviewLoading(null);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 p-3">
                    {stages.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-8">
                            {t("empty")}
                        </div>
                    )}
                    {stages.map((stage, index) => (
                        <div
                            key={stage.id}
                            className={cn(
                                "border rounded-md bg-card/50",
                                !stage.enabled && "opacity-50"
                            )}
                        >
                            <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30">
                                <Checkbox
                                    checked={stage.enabled}
                                    onCheckedChange={(c) => update(stage.id, { enabled: c === true })}
                                    aria-label={t("stageEnabled")}
                                />
                                <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">
                                    {index + 1}
                                </span>
                                <Select value={stage.type} onValueChange={(v) => update(stage.id, {
                                    type: v,
                                    // Fresh template only when the body is still the previous type's template
                                    body: stage.body === (STAGE_TEMPLATES[stage.type] ?? "{}")
                                        ? (STAGE_TEMPLATES[v] ?? "{}")
                                        : stage.body,
                                })}>
                                    <SelectTrigger className="h-7 text-xs w-[150px] font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STAGE_TYPES.map((st) => (
                                            <SelectItem key={st} value={st} className="font-mono text-xs">{st}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="ml-auto flex items-center gap-0.5">
                                    {onPreview && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                                            disabled={previewLoading !== null || !stage.enabled}
                                            onClick={() => runPreview(index)}
                                            title={t("previewToHere")}
                                        >
                                            {previewLoading === stage.id
                                                ? <IconLoader2 className="h-3 w-3 animate-spin" />
                                                : <IconPlayerPlay className="h-3 w-3" />}
                                            <span className="ml-1 hidden sm:inline">{t("preview")}</span>
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => move(index, -1)}>
                                        <IconArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === stages.length - 1} onClick={() => move(index, 1)}>
                                        <IconArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(stage.id)}>
                                        <IconTrash className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <Textarea
                                value={stage.body}
                                onChange={(e) => update(stage.id, { body: e.target.value })}
                                className="font-mono text-xs border-0 rounded-t-none focus-visible:ring-0 resize-y min-h-[60px]"
                                spellCheck={false}
                            />
                            {preview?.stageId === stage.id && (
                                <div className="border-t bg-muted/20 max-h-[220px] overflow-auto">
                                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground sticky top-0 bg-muted/60 backdrop-blur-sm">
                                        {t("previewResult", { count: preview.docs.length })}
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {preview.docs.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">{t("previewEmpty")}</p>
                                        ) : (
                                            preview.docs.map((doc, i) => (
                                                <div key={i} className="border rounded bg-card p-1">
                                                    <JsonTree data={doc} label={`#${i + 1}`} defaultExpanded={false} />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {previewError && (
                        <p className="text-xs text-destructive flex items-center gap-1.5 px-1">
                            <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate" title={previewError}>{previewError}</span>
                        </p>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => onChange([...stages, newStage()])}>
                        <IconPlus className="h-3.5 w-3.5 mr-1" />
                        {t("addStage")}
                    </Button>
                </div>
            </ScrollArea>
        </div>
    );
}
