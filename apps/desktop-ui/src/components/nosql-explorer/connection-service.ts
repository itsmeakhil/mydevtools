import { auth } from "@/database/firebase";
import { encryptData, decryptData } from "@/lib/encryption";
import { proxyJsonAuthed } from "@/lib/backend-auth";
import { toast } from "sonner";
import { SavedConnection } from "./types";

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000";

// ── proxy helper (with automatic token refresh on 401) ───────────────────────

const proxyRequest = async <T,>(
    method: string,
    path: string,
    body?: unknown
): Promise<T> => {
    if (!auth.currentUser) throw new Error("Not authenticated.");

    const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body);

    if (status < 200 || status >= 300) {
        const err = data as Record<string, unknown> | null;
        throw new Error(
            (typeof err?.detail === "string" ? err.detail : null) ||
            (typeof err?.error === "string" ? err.error : null) ||
            `Request failed (${status})`
        );
    }

    return data as T;
};

// ── raw type returned by backend (no decrypted connectionString) ──────────────

type ConnectionRaw = Omit<SavedConnection, "connectionString">;

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts the connectionString with the global master key, then saves it.
 * The server receives only the ciphertext — the raw string never leaves the browser.
 */
export const saveConnection = async (
    _userId: string,
    connectionString: string,
    name: string = "My Connection",
    encryptionKey: CryptoKey
): Promise<string> => {
    const { encrypted, iv } = await encryptData(encryptionKey, connectionString);

    const created = await proxyRequest<ConnectionRaw>(
        "POST",
        "/api/v1/nosql/connections",
        { encryptedData: encrypted, iv, name }
    );
    return created.id;
};

/**
 * Fetches saved connections and decrypts each connectionString locally.
 */
export const getConnections = async (
    _userId: string,
    encryptionKey: CryptoKey
): Promise<SavedConnection[]> => {
    const rawAll = (await proxyRequest<ConnectionRaw[]>("GET", "/api/v1/nosql/connections")) ?? [];
    // Drop malformed rows — any item missing `id`/`encryptedData`/`iv` would crash
    // downstream renders that key off `conn.id`.
    const raw = rawAll.filter(
        (c): c is ConnectionRaw =>
            !!c && typeof c === "object" && typeof c.id === "string" && !!c.encryptedData && !!c.iv
    );

    const results = await Promise.allSettled(
        raw.map(async (conn): Promise<SavedConnection> => {
            const connectionString = await decryptData(encryptionKey, conn.encryptedData, conn.iv);
            return { ...conn, connectionString };
        })
    );

    const connections: SavedConnection[] = [];
    let failedCount = 0;

    for (const result of results) {
        if (result.status === "fulfilled") {
            connections.push(result.value);
        } else {
            failedCount++;
        }
    }

    if (failedCount > 0) {
        toast.error(
            `${failedCount} connection${failedCount > 1 ? "s" : ""} could not be decrypted. ` +
            "They may have been saved before encryption was enabled — please delete and re-add them."
        );
    }

    return connections;
};

export const deleteConnection = async (_userId: string, connectionId: string): Promise<void> => {
    await proxyRequest<void>("DELETE", `/api/v1/nosql/connections/${connectionId}`);
};

/** Rename only — name is not encrypted. */
export const updateConnectionName = async (
    _userId: string,
    connectionId: string,
    newName: string
): Promise<void> => {
    await proxyRequest<void>("PATCH", `/api/v1/nosql/connections/${connectionId}`, { name: newName });
};

/**
 * Update name and/or connectionString.
 * If a new connectionString is provided it is re-encrypted with the master key.
 */
export const updateConnectionDetails = async (
    _userId: string,
    connectionId: string,
    updates: { name?: string; connectionString?: string },
    encryptionKey: CryptoKey
): Promise<void> => {
    const patch: Record<string, string> = {};

    if (updates.name !== undefined) {
        patch.name = updates.name;
    }
    if (updates.connectionString !== undefined) {
        const { encrypted, iv } = await encryptData(encryptionKey, updates.connectionString);
        patch.encryptedData = encrypted;
        patch.iv = iv;
    }

    await proxyRequest<void>("PATCH", `/api/v1/nosql/connections/${connectionId}`, patch);
};
