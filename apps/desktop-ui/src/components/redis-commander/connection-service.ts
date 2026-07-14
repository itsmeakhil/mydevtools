import { auth } from "@/database/firebase";
import { encryptData, decryptData } from "@/lib/encryption";
import { toast } from "sonner";
import { proxyJsonAuthed } from "@/lib/backend-auth";
import { RedisConnectionConfig, SavedRedisConnection } from "./types";

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000";

async function proxyRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not authenticated.");

    const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body);
    if (status < 200 || status >= 300) {
        throw new Error(`Request failed (${status})`);
    }
    return data as T;
}

type ConnectionRaw = Omit<SavedRedisConnection, "config">;

export async function getConnections(encryptionKey: CryptoKey): Promise<SavedRedisConnection[]> {
    const raw = (await proxyRequest<ConnectionRaw[]>("GET", "/api/v1/redis-commander/connections")) ?? [];

    const results = await Promise.allSettled(
        raw.map(async (conn): Promise<SavedRedisConnection> => {
            const json = await decryptData(encryptionKey, conn.encryptedData, conn.iv);
            const config = JSON.parse(json) as RedisConnectionConfig;
            return { ...conn, config };
        })
    );

    const connections: SavedRedisConnection[] = [];
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
    config: RedisConnectionConfig,
    name: string,
    encryptionKey: CryptoKey
): Promise<SavedRedisConnection> {
    const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(config));
    const created = await proxyRequest<ConnectionRaw>("POST", "/api/v1/redis-commander/connections", {
        encryptedData: encrypted,
        iv,
        name,
    });
    return { ...created, config };
}

export async function updateConnection(
    connectionId: string,
    updates: { config?: RedisConnectionConfig; name?: string },
    encryptionKey: CryptoKey
): Promise<void> {
    const patch: Record<string, string> = {};

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.config !== undefined) {
        const { encrypted, iv } = await encryptData(encryptionKey, JSON.stringify(updates.config));
        patch.encryptedData = encrypted;
        patch.iv = iv;
    }

    await proxyRequest<void>("PATCH", `/api/v1/redis-commander/connections/${connectionId}`, patch);
}

export async function deleteConnection(connectionId: string): Promise<void> {
    await proxyRequest<void>("DELETE", `/api/v1/redis-commander/connections/${connectionId}`);
}

export async function touchConnection(connectionId: string): Promise<void> {
    await proxyRequest<void>("POST", `/api/v1/redis-commander/connections/${connectionId}/touch`);
}
