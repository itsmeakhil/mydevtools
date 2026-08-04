// ponytail: handler bodies copied from src/app/app/database-explorer/page.tsx
// (lines 215-583) rather than extracted, because the existing tool must not be
// modified. If these two copies start drifting, extract a shared hook and point
// both pages at it.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { normalizeConnectionString } from "@/lib/nosql-dialects";
import { sanitizeError } from "@/lib/nosql-error-sanitizer";
import type { MongoConfig, MongoTabState } from "@/components/data-explorer/adapters/mongodb";
import type { Document } from "@/components/nosql-explorer/types";

export interface MongoActions {
    documents: Document[];
    total: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    insert: (doc: unknown) => Promise<void>;
    update: (id: string, update: unknown, mode?: "merge" | "replace") => Promise<void>;
    remove: (id: string) => Promise<void>;
    bulkDelete: (ids: string[]) => Promise<void>;
    importDocuments: (documents: unknown[]) => Promise<void>;
    loadSchema: (opts: { sampleMode: string; sampleSize: number }) => Promise<{
        fields: unknown[];
        sampleSize: number;
        validator?: unknown;
    }>;
    loadIndexes: () => Promise<{ indexes: unknown[]; totalIndexSize?: number; stats?: unknown }>;
    dropIndex: (indexName: string) => Promise<void>;
    createIndex: (keys: Record<string, number>, options: Record<string, unknown>) => Promise<void>;
    explain: (query: string) => Promise<unknown>;
    previewPipeline: (pipelineJson: string) => Promise<{ documents: unknown[] }>;
}

/**
 * Every MongoDB API call the Data Explorer document pane makes.
 *
 * The shell resolved the connection already, so this hook takes the raw config
 * and the read-only flag instead of looking a connection up. Server errors are
 * always sanitised before they reach a toast or a thrown message — connection
 * strings carry passwords.
 */
export function useMongoActions(
    config: MongoConfig,
    state: MongoTabState,
    readOnly: boolean
): MongoActions {
    const t = useTranslations("DataExplorer.toast");
    const [documents, setDocuments] = useState<Document[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // DocumentDB / Cosmos DB reject the driver's default retryWrites=true.
    const connectionString = useMemo(
        () => normalizeConnectionString(config.dbType, config.connectionString),
        [config.dbType, config.connectionString]
    );

    const { dbName, collectionName, page, limit, query, sortField, sortDirection } = state;

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const skip = (page - 1) * limit;
            const res = await apiFetch("/api/nosql/documents/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    dbName,
                    collectionName,
                    query,
                    limit,
                    skip,
                    sortField,
                    sortDirection: sortDirection || "asc",
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(sanitizeError(data.error));

            setDocuments(data.documents);
            setTotal(data.total);
            setLoading(false);
        } catch (e: unknown) {
            setLoading(false);
            setError(sanitizeError(e));
            toast.error(t("fetchFailed", { collection: collectionName }));
        }
    }, [connectionString, dbName, collectionName, page, limit, query, sortField, sortDirection, t]);

    // A setState on the tab is what triggers a refetch now — the legacy page
    // called performFetch imperatively from every handler instead.
    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbName, collectionName, page, limit, query, sortField, sortDirection]);

    const insert = async (doc: unknown) => {
        try {
            const res = await apiFetch("/api/nosql/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    readOnly,
                    dbName,
                    collectionName,
                    document: doc,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            await refresh();
        } catch (e: unknown) {
            toast.error(sanitizeError(e));
            throw e;
        }
    };

    const update = async (id: string, updateDoc: unknown, mode: "merge" | "replace" = "merge") => {
        try {
            const res = await apiFetch("/api/nosql/documents", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    readOnly,
                    dbName,
                    collectionName,
                    documentId: id,
                    update: updateDoc,
                    mode,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            await refresh();
        } catch (e: unknown) {
            toast.error(sanitizeError(e));
            throw e;
        }
    };

    const remove = async (id: string) => {
        try {
            const res = await apiFetch("/api/nosql/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    readOnly,
                    dbName,
                    collectionName,
                    documentId: id,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            toast.success(t("docDeleted"));
            await refresh();
        } catch (e: unknown) {
            toast.error(sanitizeError(e));
            throw e;
        }
    };

    const bulkDelete = async (ids: string[]) => {
        try {
            const res = await apiFetch("/api/nosql/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    readOnly,
                    dbName,
                    collectionName,
                    documentIds: ids,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            await refresh();
        } catch (e: unknown) {
            toast.error(sanitizeError(e));
            throw e;
        }
    };

    const importDocuments = async (docs: unknown[]) => {
        try {
            const res = await apiFetch("/api/nosql/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    readOnly,
                    dbName,
                    collectionName,
                    documents: docs,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            await refresh();
        } catch (e: unknown) {
            toast.error(sanitizeError(e));
            throw e;
        }
    };

    const loadSchema = useCallback(
        async (opts?: { sampleMode: string; sampleSize: number }) => {
            const res = await apiFetch("/api/nosql/schema", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    dbName,
                    collectionName,
                    sampleMode: opts?.sampleMode ?? "random",
                    sampleSize: opts?.sampleSize ?? 200,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            return data;
        },
        [connectionString, dbName, collectionName]
    );

    const loadIndexes = useCallback(async () => {
        const res = await apiFetch("/api/nosql/indexes/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString,
                dbName,
                collectionName,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(sanitizeError(data.error));
        return data;
    }, [connectionString, dbName, collectionName]);

    const dropIndex = async (indexName: string) => {
        const res = await apiFetch("/api/nosql/indexes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString,
                readOnly,
                dbName,
                collectionName,
                indexName,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(sanitizeError(data.error));
    };

    const createIndex = async (keys: Record<string, number>, options: Record<string, unknown>) => {
        const res = await apiFetch("/api/nosql/indexes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString,
                readOnly,
                dbName,
                collectionName,
                keys,
                options,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(sanitizeError(data.error));
    };

    const explain = useCallback(
        async (explainQuery: string) => {
            const res = await apiFetch("/api/nosql/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    dbName,
                    collectionName,
                    query: explainQuery,
                    sortField,
                    sortDirection: sortDirection || "asc",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            return data.explain;
        },
        [connectionString, dbName, collectionName, sortField, sortDirection]
    );

    const previewPipeline = useCallback(
        async (pipelineJson: string) => {
            const res = await apiFetch("/api/nosql/documents/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    dbName,
                    collectionName,
                    query: pipelineJson,
                    limit: 10,
                    skip: 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(sanitizeError(data.error));
            return { documents: data.documents as unknown[] };
        },
        [connectionString, dbName, collectionName]
    );

    return {
        documents,
        total,
        loading,
        error,
        refresh,
        insert,
        update,
        remove,
        bulkDelete,
        importDocuments,
        loadSchema,
        loadIndexes,
        dropIndex,
        createIndex,
        explain,
        previewPipeline,
    };
}
