"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    IconChevronRight,
    IconExternalLink,
    IconFolder,
    IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    FILTER_OPS,
    FirestoreApiError,
    buildStructuredQuery,
    decodeFields,
    listCollectionIds,
    listDocuments,
    runQuery,
    sanitizeFirestoreError,
    type FirestoreConfig,
    type FirestoreDocument,
} from "@/lib/data-explorer/firestore-api";
import type { PaneProps } from "../types";
import type { FirestoreTabState } from "../adapters/firestore";

const PAGE_SIZES = [10, 25, 50, 100, 300];

/** "projects/p/databases/d/documents/users/u1" → "users/u1". */
export function relativeDocPath(doc: FirestoreDocument): string {
    const idx = doc.name.indexOf("/documents/");
    return idx === -1 ? doc.name : doc.name.slice(idx + "/documents/".length);
}

function docId(doc: FirestoreDocument): string {
    return doc.name.slice(doc.name.lastIndexOf("/") + 1);
}

/** Translated banner text for a FirestoreApiError; falls back to its sanitized message. */
function useErrorText() {
    const t = useTranslations("DataExplorer.firestore");
    return useCallback(
        (err: unknown): { text: string; linkUrl?: string; linkLabel?: string } => {
            if (err instanceof FirestoreApiError) {
                switch (err.kind) {
                    case "permissionDenied":
                        return { text: t("errPermissionDenied") };
                    case "serviceDisabled":
                        return {
                            text: t("errServiceDisabled"),
                            linkUrl: err.activationUrl,
                            linkLabel: t("errOpenConsole"),
                        };
                    case "indexRequired":
                        return {
                            text: t("errIndexRequired"),
                            linkUrl: err.indexUrl,
                            linkLabel: t("errCreateIndex"),
                        };
                    case "datastoreMode":
                        return { text: t("errDatastoreMode") };
                    case "quota":
                        return { text: t("errQuota") };
                    case "clockSkew":
                        return { text: t("errClockSkew") };
                    case "serviceAccountRejected":
                        return { text: t("errServiceAccountRejected") };
                    case "network":
                        return { text: t("errNetwork") };
                    case "notFound":
                        return { text: t("errNotFound") };
                }
            }
            return {
                text: sanitizeFirestoreError(err instanceof Error ? err.message : String(err)),
            };
        },
        [t],
    );
}

export function FirestoreCollectionPane({
    connection,
    config,
    state,
    setState,
}: PaneProps<FirestoreConfig, FirestoreTabState>) {
    const t = useTranslations("DataExplorer.firestore");
    const errorText = useErrorText();
    const readOnly = !!connection.readOnly;
    void readOnly; // gates the write UI added below

    const [docs, setDocs] = useState<FirestoreDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    // Cursor paging: tokens that led to the current page; the last entry is
    // the current page's token (undefined = first page). Never offset-based.
    const [prevTokens, setPrevTokens] = useState<(string | undefined)[]>([undefined]);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [selected, setSelected] = useState<FirestoreDocument | null>(null);
    const [subcollections, setSubcollections] = useState<string[] | null>(null);

    // Draft filter controls; Apply copies them into tab state (persisted).
    const [draftField, setDraftField] = useState(state.filterField);
    const [draftOp, setDraftOp] = useState(state.filterOp);
    const [draftValue, setDraftValue] = useState(state.filterValue);
    const [draftOrderBy, setDraftOrderBy] = useState(state.orderByField);
    const [draftDir, setDraftDir] = useState<"asc" | "desc">(state.orderByDir);

    const hasQuery = !!(state.filterField.trim() || state.orderByField.trim());

    const pathSegments = useMemo(() => state.collectionPath.split("/"), [state.collectionPath]);

    const load = useCallback(
        async (pageToken: string | undefined) => {
            setLoading(true);
            setError(null);
            try {
                if (hasQuery) {
                    const collectionId = pathSegments[pathSegments.length - 1];
                    const parentDoc = pathSegments.slice(0, -1).join("/") || undefined;
                    const rows = await runQuery(
                        config,
                        parentDoc,
                        buildStructuredQuery({
                            collectionId,
                            filterField: state.filterField,
                            filterOp: state.filterOp,
                            filterValue: state.filterValue,
                            orderByField: state.orderByField,
                            orderByDir: state.orderByDir,
                            limit: state.pageSize,
                        }),
                    );
                    setDocs(rows);
                    setNextToken(undefined);
                } else {
                    const out = await listDocuments(
                        config,
                        state.collectionPath,
                        state.pageSize,
                        pageToken,
                    );
                    setDocs(out.documents);
                    setNextToken(out.nextPageToken);
                }
            } catch (err) {
                setError(err);
                setDocs([]);
                setNextToken(undefined);
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            config.serviceAccountJson,
            config.databaseId,
            state.collectionPath,
            state.filterField,
            state.filterOp,
            state.filterValue,
            state.orderByField,
            state.orderByDir,
            state.pageSize,
            hasQuery,
        ],
    );

    // Refetch from page one whenever the query inputs change.
    useEffect(() => {
        setPrevTokens([undefined]);
        setSelected(null);
        setSubcollections(null);
        void load(undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, state.refreshTick]);

    // Lazy subcollection lookup for the selected document.
    useEffect(() => {
        if (!selected) return;
        let cancelled = false;
        setSubcollections(null);
        listCollectionIds(config, relativeDocPath(selected))
            .then((ids) => {
                if (!cancelled) setSubcollections(ids);
            })
            .catch(() => {
                if (!cancelled) setSubcollections([]);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.name]);

    const goNext = () => {
        setPrevTokens((prev) => [...prev, nextToken]);
        void load(nextToken);
    };
    const goPrev = () => {
        const tokens = prevTokens.slice(0, -1);
        setPrevTokens(tokens);
        void load(tokens[tokens.length - 1]);
    };

    const applyFilters = () =>
        setState((prev) => ({
            ...prev,
            filterField: draftField,
            filterOp: draftOp,
            filterValue: draftValue,
            orderByField: draftOrderBy,
            orderByDir: draftDir,
        }));
    const clearFilters = () => {
        setDraftField("");
        setDraftValue("");
        setDraftOrderBy("");
        setState((prev) => ({
            ...prev,
            filterField: "",
            filterOp: "==",
            filterValue: "",
            orderByField: "",
            orderByDir: "asc",
        }));
    };

    /** In-tab navigation: breadcrumb up, subcollection chips down. */
    const navigateTo = (collectionPath: string) =>
        setState((prev) => ({
            ...prev,
            collectionPath,
            filterField: "",
            filterOp: "==",
            filterValue: "",
            orderByField: "",
            orderByDir: "asc",
        }));

    const banner = error ? errorText(error) : null;

    return (
        <div className="flex h-full flex-col">
            {/* Breadcrumb + toolbar */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-xs">
                    {pathSegments.map((seg, i) => {
                        const isCollection = i % 2 === 0;
                        const isLast = i === pathSegments.length - 1;
                        return (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <IconChevronRight className="size-3 shrink-0 text-muted-foreground" />
                                )}
                                {isCollection && !isLast ? (
                                    <button
                                        type="button"
                                        className="shrink-0 rounded px-1 py-0.5 hover:bg-muted/60"
                                        onClick={() =>
                                            navigateTo(pathSegments.slice(0, i + 1).join("/"))
                                        }
                                    >
                                        {seg}
                                    </button>
                                ) : (
                                    <span
                                        className={cn(
                                            "shrink-0 px-1 py-0.5",
                                            isLast ? "font-medium" : "text-muted-foreground",
                                        )}
                                    >
                                        {seg}
                                    </span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
                <Select
                    value={String(state.pageSize)}
                    onValueChange={(v) => setState((prev) => ({ ...prev, pageSize: Number(v) }))}
                >
                    <SelectTrigger className="h-7 w-[70px] text-xs">
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
                    className="size-7"
                    onClick={() =>
                        setState((prev) => ({ ...prev, refreshTick: prev.refreshTick + 1 }))
                    }
                    disabled={loading}
                >
                    <IconRefresh className="size-3.5" />
                </Button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-end gap-2 border-b px-3 py-2">
                <div className="w-36">
                    <Input
                        value={draftField}
                        onChange={(e) => setDraftField(e.target.value)}
                        placeholder={t("filterField")}
                        className="h-7 font-mono text-xs"
                    />
                </div>
                <Select value={draftOp} onValueChange={setDraftOp}>
                    <SelectTrigger className="h-7 w-[130px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FILTER_OPS.map((op) => (
                            <SelectItem key={op} value={op} className="font-mono text-xs">
                                {op}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="w-36">
                    <Input
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        placeholder={t("filterValue")}
                        className="h-7 font-mono text-xs"
                    />
                </div>
                <div className="w-32">
                    <Input
                        value={draftOrderBy}
                        onChange={(e) => setDraftOrderBy(e.target.value)}
                        placeholder={t("orderBy")}
                        className="h-7 font-mono text-xs"
                        title={t("orderByHint")}
                    />
                </div>
                <Select value={draftDir} onValueChange={(v) => setDraftDir(v as "asc" | "desc")}>
                    <SelectTrigger className="h-7 w-[80px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="asc" className="text-xs">
                            asc
                        </SelectItem>
                        <SelectItem value="desc" className="text-xs">
                            desc
                        </SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" size="sm" className="h-7 text-xs" onClick={applyFilters}>
                    {t("apply")}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={clearFilters}
                >
                    {t("clear")}
                </Button>
            </div>

            {banner && (
                <div className="flex items-center gap-2 border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <span className="min-w-0 flex-1">{banner.text}</span>
                    {banner.linkUrl && (
                        <a
                            href={banner.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex shrink-0 items-center gap-1 font-medium underline"
                        >
                            {banner.linkLabel}
                            <IconExternalLink className="size-3" />
                        </a>
                    )}
                </div>
            )}

            <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
                <ResizablePanel defaultSize={40} minSize={20}>
                    <div className="flex h-full flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {docs.length === 0 && !loading && !error ? (
                                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                                    {t("emptyCollection")}
                                </p>
                            ) : (
                                docs.map((doc) => {
                                    const isSelected = selected?.name === doc.name;
                                    return (
                                        <button
                                            key={doc.name}
                                            type="button"
                                            onClick={() => setSelected(doc)}
                                            className={cn(
                                                "block w-full border-b px-3 py-1.5 text-left transition-colors hover:bg-muted/60",
                                                isSelected && "bg-muted",
                                            )}
                                        >
                                            <span className="block truncate font-mono text-xs font-medium">
                                                {docId(doc)}
                                            </span>
                                            <span className="block truncate text-[10px] text-muted-foreground">
                                                {JSON.stringify(decodeFields(doc.fields ?? {}))}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">
                                {hasQuery
                                    ? t("queryLimitNote", { count: state.pageSize })
                                    : t("docCount", { count: docs.length })}
                            </span>
                            {!hasQuery && (
                                <span className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs"
                                        onClick={goPrev}
                                        disabled={loading || prevTokens.length <= 1}
                                    >
                                        {t("prevPage")}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs"
                                        onClick={goNext}
                                        disabled={loading || !nextToken}
                                    >
                                        {t("nextPage")}
                                    </Button>
                                </span>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={60} minSize={25}>
                    {selected ? (
                        <div className="flex h-full flex-col">
                            <div className="flex items-center gap-2 border-b px-3 py-2">
                                <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
                                    {docId(selected)}
                                </span>
                                {selected.updateTime && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {selected.updateTime}
                                    </span>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto p-3">
                                <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                                    {JSON.stringify(decodeFields(selected.fields ?? {}), null, 2)}
                                </pre>
                            </div>
                            <div className="border-t px-3 py-2">
                                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase">
                                    {t("subcollections")}
                                </p>
                                {subcollections === null ? (
                                    <p className="text-xs text-muted-foreground">…</p>
                                ) : subcollections.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t("noSubcollections")}
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {subcollections.map((id) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() =>
                                                    navigateTo(
                                                        `${relativeDocPath(selected)}/${id}`,
                                                    )
                                                }
                                                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted/60"
                                            >
                                                <IconFolder className="size-3 text-amber-500" />
                                                {id}
                                            </button>
                                        ))}
                                    </div>
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
        </div>
    );
}
