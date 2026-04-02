import { auth } from "@/database/firebase";
import { SavedConnection } from "./types";

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

const proxyRequest = async <T,>(
    method: string,
    path: string,
    body?: unknown
): Promise<T> => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not authenticated.");

    const idToken = await currentUser.getIdToken();
    const url = new URL(path, BACKEND_BASE_URL).toString();

    const headersObj: Record<string, string> = {
        Authorization: `Bearer ${idToken}`,
    };

    const proxyBody = body !== undefined ? JSON.stringify(body) : undefined;
    if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
        headersObj["Content-Type"] = "application/json";
    }

    const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url,
            method,
            headers: headersObj,
            body: proxyBody,
        }),
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
};

export const saveConnection = async (userId: string, connectionString: string, name?: string) => {
    try {
        const created = await proxyRequest<SavedConnection>(
            "POST",
            "/api/v1/nosql/connections",
            { connectionString, name: name || "My Connection" }
        );

        return created.id;
    } catch (error) {
        console.error("Error saving connection:", error);
        throw error;
    }
};

export const getConnections = async (_userId: string): Promise<SavedConnection[]> => {
    try {
        return (await proxyRequest<SavedConnection[]>("GET", "/api/v1/nosql/connections")) ?? [];
    } catch (error) {
        console.error("Error getting connections:", error);
        throw error;
    }
};

export const deleteConnection = async (userId: string, connectionId: string) => {
    try {
        await proxyRequest<void>("DELETE", `/api/v1/nosql/connections/${connectionId}`);
    } catch (error) {
        console.error("Error deleting connection:", error);
        throw error;
    }
};

export const updateConnectionName = async (userId: string, connectionId: string, newName: string) => {
    try {
        await proxyRequest<void>("PATCH", `/api/v1/nosql/connections/${connectionId}`, { name: newName });
    } catch (error) {
        console.error("Error updating connection name:", error);
        throw error;
    }
};
export const updateConnectionDetails = async (userId: string, connectionId: string, updates: { name?: string, connectionString?: string }) => {
    try {
        await proxyRequest<void>("PATCH", `/api/v1/nosql/connections/${connectionId}`, updates);
    } catch (error) {
        console.error("Error updating connection details:", error);
        throw error;
    }
};
