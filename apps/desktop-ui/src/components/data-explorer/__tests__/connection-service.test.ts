import { webcrypto } from "node:crypto";

// encryption.ts reaches for `window.crypto` / `window.btoa` / `window.atob`, but
// jest-environment-node exposes none of the `window` global. Same shim as
// src/lib/__tests__/content-envelope.test.ts — polyfill from node:crypto before
// the module under test loads. Do not mock the crypto primitives themselves.
if (typeof globalThis.crypto === "undefined") {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, writable: true, configurable: true });
}
const g = globalThis as unknown as { window?: Record<string, unknown>; btoa: unknown; atob: unknown };
g.window = g.window ?? {};
g.window.crypto = globalThis.crypto;
g.window.btoa = g.btoa;
g.window.atob = g.atob;

import { decodeConnection } from "../connection-service";
import { encryptData } from "@/lib/encryption";

async function testKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
        "encrypt",
        "decrypt",
    ]);
}

describe("decodeConnection", () => {
    it("round-trips a Mongo config", async () => {
        const key = await testKey();
        const config = { connectionString: "mongodb://localhost:27017", dbType: "mongodb" };
        const { encrypted, iv } = await encryptData(key, JSON.stringify(config));

        const decoded = await decodeConnection(
            {
                id: "c1",
                userId: "desktop-local",
                sourceId: "mongodb",
                name: "local",
                encryptedData: encrypted,
                iv,
                createdAt: 1,
                lastUsedAt: 1,
            },
            key
        );

        expect(decoded.config).toEqual(config);
        expect(decoded.sourceId).toBe("mongodb");
    });

    it("round-trips a Redis config", async () => {
        const key = await testKey();
        const config = { redisUrl: "redis://localhost:6379" };
        const { encrypted, iv } = await encryptData(key, JSON.stringify(config));

        const decoded = await decodeConnection(
            {
                id: "c2",
                userId: "desktop-local",
                sourceId: "redis",
                name: "cache",
                encryptedData: encrypted,
                iv,
                createdAt: 1,
                lastUsedAt: 1,
            },
            key
        );

        expect(decoded.config).toEqual(config);
    });

    it("rejects a payload encrypted with a different key", async () => {
        const keyA = await testKey();
        const keyB = await testKey();
        const { encrypted, iv } = await encryptData(keyA, JSON.stringify({ redisUrl: "x" }));

        await expect(
            decodeConnection(
                {
                    id: "c3",
                    userId: "desktop-local",
                    sourceId: "redis",
                    name: "bad",
                    encryptedData: encrypted,
                    iv,
                    createdAt: 1,
                    lastUsedAt: 1,
                },
                keyB
            )
        ).rejects.toBeDefined();
    });
});
