import { encryptData, decryptData } from "@/lib/encryption";
import { apiRequestRaw } from "@/lib/backend-api";
import { toast } from "sonner";
import type { ConnectionFormValues, SourceId, UnifiedConnection } from "./types";

const BASE_PATH = "/api/v1/data-explorer/connections";

/** Raw store row — the decrypted `config` is never present on the wire. */
export type UnifiedConnectionRaw = Omit<UnifiedConnection, "config">;

async function proxyRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await apiRequestRaw<T>(method, path, body);
    if (status < 200 || status >= 300) {
        const err = data as Record<string, unknown> | null;
        throw new Error(
            (typeof err?.detail === "string" ? err.detail : null) ||
                (typeof err?.error === "string" ? err.error : null) ||
                `Request failed (${status})`
        );
    }
    return data as T;
}

/** Decrypt one row's config blob. Throws when the master key does not match. */
export async function decodeConnection(
    raw: UnifiedConnectionRaw,
    encryptionKey: CryptoKey
): Promise<UnifiedConnection> {
    const json = await decryptData(encryptionKey, raw.encryptedData, raw.iv);
    return { ...raw, config: JSON.parse(json) as unknown };
}

export async function listConnections(encryptionKey: CryptoKey): Promise<UnifiedConnection[]> {
    const rawAll = (await proxyRequest<UnifiedConnectionRaw[]>("GET", BASE_PATH)) ?? [];
    // Drop malformed rows — a row missing id/encryptedData/iv would crash the
    // list render that keys off conn.id.
    const raw = rawAll.filter(
        (c): c is UnifiedConnectionRaw =>
            !!c &&
            typeof c === "object" &&
            typeof c.id === "string" &&
            typeof c.sourceId === "string" &&
            !!c.encryptedData &&
            !!c.iv
    );

    const results = await Promise.allSettled(raw.map((c) => decodeConnection(c, encryptionKey)));

    const connections: UnifiedConnection[] = [];
    let failedCount = 0;
    for (const result of results) {
        if (result.status === "fulfilled") connections.push(result.value);
        else failedCount++;
    }

    if (failedCount > 0) {
        toast.error(
            `${failedCount} connection${failedCount > 1 ? "s" : ""} could not be decrypted. ` +
                "Delete and re-add them."
        );
    }

    return connections;
}

export async function saveConnection(
    sourceId: SourceId,
    values: ConnectionFormValues<unknown>,
    encryptionKey: CryptoKey
): Promise<UnifiedConnection> {
    const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(values.config));
    const created = await proxyRequest<UnifiedConnectionRaw>("POST", BASE_PATH, {
        sourceId,
        name: values.name,
        folder: values.folder ?? "",
        color: values.color ?? null,
        readOnly: values.readOnly ?? false,
        encryptedData: encrypted,
        iv,
    });
    return { ...created, config: values.config };
}

export async function updateConnection(
    id: string,
    patch: Partial<ConnectionFormValues<unknown>>,
    encryptionKey: CryptoKey
): Promise<void> {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.folder !== undefined) body.folder = patch.folder;
    if (patch.color !== undefined) body.color = patch.color;
    if (patch.readOnly !== undefined) body.readOnly = patch.readOnly;
    if (patch.config !== undefined) {
        const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(patch.config));
        body.encryptedData = encrypted;
        body.iv = iv;
    }
    await proxyRequest<void>("PATCH", `${BASE_PATH}/${id}`, body);
}

export async function deleteConnection(id: string): Promise<void> {
    await proxyRequest<void>("DELETE", `${BASE_PATH}/${id}`);
}

export async function touchConnection(id: string): Promise<void> {
    await proxyRequest<void>("POST", `${BASE_PATH}/${id}/touch`);
}
