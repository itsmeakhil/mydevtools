// redis.tsx (via RedisConnectionForm) imports next-intl's useTranslations;
// mock it per this repo's established pattern for test files that
// transitively import a next-intl-consuming component (see
// mongodb-adapter.test.ts and sources.test.ts).
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

import { redisAdapter, buildRedisUrl } from "../adapters/redis";

describe("buildRedisUrl", () => {
    const base = { host: "", port: "", username: "", password: "", db: "", tls: false };

    it("defaults host and port", () => {
        expect(buildRedisUrl(base)).toBe("redis://localhost:6379");
    });

    it("switches scheme for TLS", () => {
        expect(buildRedisUrl({ ...base, tls: true })).toBe("rediss://localhost:6379");
    });

    it("percent-encodes credentials and appends the db index", () => {
        expect(
            buildRedisUrl({ ...base, host: "h", port: "6380", username: "u@x", password: "p:w", db: "3" })
        ).toBe("redis://u%40x:p%3Aw@h:6380/3");
    });
});

describe("redis adapter", () => {
    it("starts blank on the conventional local URL", () => {
        expect(redisAdapter.blankConfig()).toEqual({ redisUrl: "redis://localhost:6379" });
    });

    // Assert the exact KEY, not mere truthiness — a truthiness check would
    // still pass if the adapter regressed to returning raw English.
    it("rejects an empty or non-redis URL with the right i18n keys", () => {
        expect(redisAdapter.validate({ redisUrl: "" })).toBe("validation.redisUrlRequired");
        expect(redisAdapter.validate({ redisUrl: "mongodb://localhost:27017" })).toBe(
            "validation.redisUrlScheme"
        );
    });

    // Mirror Task 8's guard: a misspelled key renders as a broken path to the
    // user, and an exact-match assertion alone would not catch it.
    it("returns only keys that resolve in messages/en.json", () => {
        const messages = require("../../../../messages/en.json");
        for (const key of ["validation.redisUrlRequired", "validation.redisUrlScheme"]) {
            const resolved = key
                .split(".")
                .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part],
                    messages.DataExplorer);
            expect(typeof resolved).toBe("string");
            expect(resolved).not.toBe("");
        }
    });

    it("accepts redis:// and rediss://", () => {
        expect(redisAdapter.validate({ redisUrl: "redis://localhost:6379" })).toBeNull();
        expect(redisAdapter.validate({ redisUrl: "rediss://user:pass@host:6380/2" })).toBeNull();
    });

    it("identifies itself consistently", () => {
        expect(redisAdapter.id).toBe("redis");
        expect(redisAdapter.label).toBe("Redis");
    });
});
