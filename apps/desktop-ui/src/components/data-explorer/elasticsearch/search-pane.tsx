"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    ElasticsearchApiError,
    deleteDoc,
    indexDoc,
    prepareDocSource,
    prepareSearchBody,
    sanitizeElasticsearchError,
    search,
    type DocWriteError,
    type ElasticsearchConfig,
    type EsHit,
    type SearchPrepError,
} from "@/lib/data-explorer/elasticsearch-api";
import type { PaneProps } from "../types";
import type { ElasticsearchTabState } from "../adapters/elasticsearch";

const PAGE_SIZES = [10, 25, 50, 100];

/** Translated banner text for an ElasticsearchApiError; falls back to its sanitized message. */
function useErrorText() {
    const t = useTranslations("DataExplorer.elasticsearch");
    return useCallback(
        (err: unknown): string => {
            if (err instanceof ElasticsearchApiError) {
                switch (err.kind) {
                    case "auth":
                        return t("errAuth");
                    case "forbidden":
                        return t("errForbidden");
                    case "notFound":
                        return t("errNotFound");
                    case "badQuery":
                        return t("errBadQuery");
                    case "conflict":
                        return t("errConflict");
                    case "network":
                        return t("errNetwork");
                }
            }
            return sanitizeElasticsearchError(err instanceof Error ? err.message : String(err));
        },
        [t],
    );
}

export function ElasticsearchSearchPane({
    connection,
    config,
    state,
    setState,
}: PaneProps<ElasticsearchConfig, ElasticsearchTabState>) {
    const t = useTranslations("DataExplorer.elasticsearch");
    const errorText = useErrorText();
    const readOnly = !!connection.readOnly;

    const [hits, setHits] = useState<EsHit[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [selected, setSelected] = useState<EsHit | null>(null);

    // Draft query controls; Run copies them into tab state (persisted).
    const [draftQueryString, setDraftQueryString] = useState(state.queryString);
    const [draftDsl, setDraftDsl] = useState(state.dslText);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const prepared = prepareSearchBody({
            index: state.index,
            mode: state.mode,
            queryString: state.queryString,
            dslText: state.dslText,
            size: state.size,
            from: state.from,
        });
        if ("error" in prepared) {
            setError(
                new ElasticsearchApiError(
                    "badQuery",
                    prepared.error === "notObject" ? "query body must be an object" : "invalid query JSON",
                ),
            );
            setHits([]);
            setTotal(null);
            setLoading(false);
            return;
        }
        try {
            const out = await search(config, state.index, prepared.body);
            setHits(out.hits);
            setTotal(out.total);
        } catch (err) {
            setError(err);
            setHits([]);
            setTotal(null);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        config.baseUrl,
        config.authMode,
        config.username,
        config.password,
        config.apiKey,
        config.bearerToken,
        state.index,
        state.mode,
        state.queryString,
        state.dslText,
        state.size,
        state.from,
    ]);

    useEffect(() => {
        setSelected(null);
        void load();
    }, [load, state.refreshTick]);

    const runQuery = () =>
        setState((prev) => ({
            ...prev,
            queryString: draftQueryString,
            dslText: draftDsl,
            from: 0,
        }));

    const setMode = (mode: "lucene" | "dsl") => setState((prev) => ({ ...prev, mode, from: 0 }));

    const goNext = () => setState((prev) => ({ ...prev, from: prev.from + prev.size }));
    const goPrev = () =>
        setState((prev) => ({ ...prev, from: Math.max(0, prev.from - prev.size) }));

    // ------------------------------------------------------------- writes
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [newDocOpen, setNewDocOpen] = useState(false);
    const [newDocId, setNewDocId] = useState("");
    const [newDocText, setNewDocText] = useState("{\n}");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [mutating, setMutating] = useState(false);

    const writeErrorText = (code: DocWriteError | SearchPrepError): string =>
        code === "notObject" ? t("errDocNotObject") : t("errInvalidDocJson");

    const mutationMessage = (err: unknown): string =>
        err instanceof ElasticsearchApiError
            ? errorText(err)
            : sanitizeElasticsearchError(err instanceof Error ? err.message : String(err));

    async function saveEdit() {
        if (readOnly || !selected) return;
        const prepared = prepareDocSource(editText);
        if ("error" in prepared) {
            toast.error(writeErrorText(prepared.error));
            return;
        }
        setMutating(true);
        try {
            await indexDoc(config, selected._index, selected._id, prepared.source);
            const updated = { ...selected, _source: prepared.source };
            setSelected(updated);
            setHits((prev) => prev.map((h) => (h._id === updated._id ? updated : h)));
            setEditing(false);
            toast.success(t("toast.docUpdated"));
        } catch (err) {
            toast.error(t("toast.saveFailed", { message: mutationMessage(err) }));
        } finally {
            setMutating(false);
        }
    }

    async function createDoc() {
        if (readOnly) return;
        const prepared = prepareDocSource(newDocText);
        if ("error" in prepared) {
            toast.error(writeErrorText(prepared.error));
            return;
        }
        setMutating(true);
        try {
            await indexDoc(config, state.index, newDocId.trim() || undefined, prepared.source);
            setNewDocOpen(false);
            setNewDocId("");
            setNewDocText("{\n}");
            toast.success(t("toast.docCreated"));
            setState((prev) => ({ ...prev, refreshTick: prev.refreshTick + 1 }));
        } catch (err) {
            toast.error(t("toast.createFailed", { message: mutationMessage(err) }));
        } finally {
            setMutating(false);
        }
    }

    async function confirmDelete() {
        if (readOnly || !selected) return;
        setMutating(true);
        try {
            await deleteDoc(config, selected._index, selected._id);
            setHits((prev) => prev.filter((h) => h._id !== selected._id));
            setSelected(null);
            setDeleteOpen(false);
            toast.success(t("toast.docDeleted"));
        } catch (err) {
            toast.error(t("toast.deleteFailed", { message: mutationMessage(err) }));
        } finally {
            setMutating(false);
        }
    }

    const banner = error ? errorText(error) : null;
    const page = Math.floor(state.from / state.size) + 1;

    return (
        <div className="flex h-full flex-col">
            {/* Query toolbar */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <Select value={state.mode} onValueChange={(v) => setMode(v as "lucene" | "dsl")}>
                    <SelectTrigger className="h-7 w-[110px] shrink-0 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="lucene" className="text-xs">
                            {t("modeLucene")}
                        </SelectItem>
                        <SelectItem value="dsl" className="text-xs">
                            {t("modeDsl")}
                        </SelectItem>
                    </SelectContent>
                </Select>
                {state.mode === "lucene" ? (
                    <Input
                        value={draftQueryString}
                        onChange={(e) => setDraftQueryString(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") runQuery();
                        }}
                        placeholder={t("lucenePlaceholder")}
                        className="h-7 min-w-0 flex-1 font-mono text-xs"
                    />
                ) : (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {t("dslBelow")}
                    </span>
                )}
                <Button type="button" size="sm" className="h-7 shrink-0 text-xs" onClick={runQuery}>
                    {t("run")}
                </Button>
                <Select
                    value={String(state.size)}
                    onValueChange={(v) =>
                        setState((prev) => ({ ...prev, size: Number(v), from: 0 }))
                    }
                >
                    <SelectTrigger className="h-7 w-[70px] shrink-0 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZES.map((n) => (
                            <SelectItem key={n} value={String(n)} className="text-xs">
                                {n}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() =>
                        setState((prev) => ({ ...prev, refreshTick: prev.refreshTick + 1 }))
                    }
                    disabled={loading}
                >
                    <IconRefresh className="size-3.5" />
                </Button>
                {!readOnly && (
                    <Button
                        type="button"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={() => setNewDocOpen(true)}
                    >
                        <IconPlus className="size-3.5" />
                        {t("newDocument")}
                    </Button>
                )}
            </div>

            {state.mode === "dsl" && (
                <div className="border-b px-3 py-2">
                    <Textarea
                        value={draftDsl}
                        onChange={(e) => setDraftDsl(e.target.value)}
                        placeholder={t("dslPlaceholder")}
                        rows={5}
                        className="font-mono text-xs"
                    />
                </div>
            )}

            {banner && (
                <div className="border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {banner}
                </div>
            )}

            <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
                <ResizablePanel defaultSize={40} minSize={20}>
                    <div className="flex h-full flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {hits.length === 0 && !loading && !error ? (
                                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                                    {t("noHits")}
                                </p>
                            ) : (
                                hits.map((hit) => {
                                    const isSelected = selected?._id === hit._id;
                                    return (
                                        <button
                                            key={hit._id}
                                            type="button"
                                            onClick={() => {
                                                setSelected(hit);
                                                setEditing(false);
                                            }}
                                            className={cn(
                                                "block w-full border-b px-3 py-1.5 text-left transition-colors hover:bg-muted/60",
                                                isSelected && "bg-muted",
                                            )}
                                        >
                                            <span className="block truncate font-mono text-xs font-medium">
                                                {hit._id}
                                            </span>
                                            <span className="block truncate text-[10px] text-muted-foreground">
                                                {JSON.stringify(hit._source)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">
                                {total === null
                                    ? t("hitCount", { count: hits.length })
                                    : t("hitCountTotal", { count: hits.length, total })}
                            </span>
                            <span className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={goPrev}
                                    disabled={loading || state.from === 0}
                                >
                                    {t("prevPage")}
                                </Button>
                                <span className="text-muted-foreground">{page}</span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={goNext}
                                    disabled={loading || hits.length < state.size}
                                >
                                    {t("nextPage")}
                                </Button>
                            </span>
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={60} minSize={25}>
                    {selected ? (
                        <div className="flex h-full flex-col">
                            <div className="flex items-center gap-2 border-b px-3 py-2">
                                <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
                                    {selected._id}
                                </span>
                                {!readOnly && !editing && (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => {
                                                setEditText(JSON.stringify(selected._source, null, 2));
                                                setEditing(true);
                                            }}
                                        >
                                            <IconPencil className="size-3" />
                                            {t("edit")}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs text-destructive"
                                            onClick={() => setDeleteOpen(true)}
                                        >
                                            <IconTrash className="size-3" />
                                        </Button>
                                    </>
                                )}
                                {!readOnly && editing && (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={saveEdit}
                                            disabled={mutating}
                                        >
                                            {t("save")}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => setEditing(false)}
                                            disabled={mutating}
                                        >
                                            {t("cancel")}
                                        </Button>
                                    </>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto p-3">
                                {editing ? (
                                    <Textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        disabled={mutating}
                                        className="h-full min-h-[200px] resize-none font-mono text-xs"
                                    />
                                ) : (
                                    <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                                        {JSON.stringify(selected._source, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {t("selectDoc")}
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>

            <Dialog open={newDocOpen} onOpenChange={(open) => !mutating && setNewDocOpen(open)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("newDocument")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="es-new-id" className="text-xs">
                                {t("docIdLabel")}
                            </Label>
                            <Input
                                id="es-new-id"
                                value={newDocId}
                                onChange={(e) => setNewDocId(e.target.value)}
                                disabled={mutating}
                                className="h-8 font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">{t("docIdAutoHint")}</p>
                        </div>
                        <Textarea
                            value={newDocText}
                            onChange={(e) => setNewDocText(e.target.value)}
                            disabled={mutating}
                            rows={10}
                            className="font-mono text-xs"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewDocOpen(false)}
                            disabled={mutating}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="button" onClick={createDoc} disabled={mutating}>
                            {t("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={(open) => !mutating && setDeleteOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDocTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDocBody", { id: selected ? selected._id : "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={mutating}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={mutating}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t("deleteDocTitle")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
