import { auth } from "@/database/firebase";
import { encryptData, decryptData } from "@/lib/encryption";
import { toast } from "sonner";
import { SavedSqlConnection, SqlConnectionConfig } from "./types";

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000";

type ProxyResponse = {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    isBase64: boolean;
    time: number;
    size: number;
    error?: string;
};

async function proxyRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not authenticated.");

    const url = new URL(path, BACKEND_BASE_URL).toString();
    const headersObj: Record<string, string> = {};
    const proxyBody = body !== undefined ? JSON.stringify(body) : undefined;
    if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
        headersObj["Content-Type"] = "application/json";
    }

    const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers: headersObj, body: proxyBody }),
    });

    const proxyData = (await proxyRes.json()) as ProxyResponse;
    if (proxyData.status < 200 || proxyData.status >= 300) {
        throw new Error(proxyData.body || proxyData.statusText || proxyData.error || "Request failed");
    }

    if (!proxyData.body) return undefined as T;
    try {
        return JSON.parse(proxyData.body) as T;
    } catch {
        return proxyData.body as unknown as T;
    }
}

type ConnectionRaw = Omit<SavedSqlConnection, "config">;

export async function getConnections(encryptionKey: CryptoKey): Promise<SavedSqlConnection[]> {
    const raw = (await proxyRequest<ConnectionRaw[]>("GET", "/api/v1/sql-client/connections")) ?? [];

    const results = await Promise.allSettled(
        raw.map(async (conn): Promise<SavedSqlConnection> => {
            const json = await decryptData(encryptionKey, conn.encryptedData, conn.iv);
            const config = JSON.parse(json) as SqlConnectionConfig;
            return { ...conn, config };
        })
    );

    const connections: SavedSqlConnection[] = [];
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
}

export async function saveConnection(
    config: SqlConnectionConfig,
    name: string,
    encryptionKey: CryptoKey
): Promise<SavedSqlConnection> {
    const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(config));
    const created = await proxyRequest<ConnectionRaw>("POST", "/api/v1/sql-client/connections", {
        encryptedData: encrypted,
        iv,
        name,
        type: config.type,
    });
    return { ...created, config };
}

export async function updateConnection(
    connectionId: string,
    updates: { config?: SqlConnectionConfig; name?: string },
    encryptionKey: CryptoKey
): Promise<void> {
    const patch: Record<string, string> = {};

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.config !== undefined) {
        const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(updates.config));
        patch.encryptedData = encrypted;
        patch.iv = iv;
        patch.type = updates.config.type;
    }

    await proxyRequest<void>("PATCH", `/api/v1/sql-client/connections/${connectionId}`, patch);
}

export async function deleteConnection(connectionId: string): Promise<void> {
    await proxyRequest<void>("DELETE", `/api/v1/sql-client/connections/${connectionId}`);
}

export async function touchConnection(connectionId: string): Promise<void> {
    await proxyRequest<void>("POST", `/api/v1/sql-client/connections/${connectionId}/touch`);
}
