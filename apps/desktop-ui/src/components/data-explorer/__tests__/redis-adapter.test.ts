// redis.tsx (via RedisConnectionForm) imports next-intl's useTranslations;
// mock it per this repo's established pattern for test files that
// transitively import a next-intl-consuming component (see
// mongodb-adapter.test.ts and sources.test.ts).
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
// redis.tsx's pane imports @/components/ui/resizable, whose react-resizable-panels
// build ships as ESM and cannot be parsed under this node-environment jest
// config. These logic tests never render the pane, so a stub is enough.
jest.mock("react-resizable-panels", () => ({
    Panel: () => null,
    PanelGroup: () => null,
    PanelResizeHandle: () => null,
}))

import { redisAdapter, buildRedisUrl, sanitizeRedisError } from "../adapters/redis";

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

describe("sanitizeRedisError", () => {
    // CRITICAL regression: the old implementation failed OPEN — when
    // `new URL(redisUrl)` threw, the catch returned the raw, unsanitized
    // message. `validate()` only checks the scheme regex, not full URL
    // well-formedness, so a `redisUrl` that clears validation can still
    // blow up `new URL()` (e.g. a non-numeric port).
    it("still strips credentials when redisUrl fails to parse", () => {
        // Passes validate()'s scheme check but is invalid to `new URL()`
        // (non-numeric port) — this is the exact fail-open trigger.
        expect(() => new URL("redis://host:notaport")).toThrow();
        expect(redisAdapter.validate({ redisUrl: "redis://host:notaport" })).toBeNull();

        const message = "connect ECONNREFUSED to redis://admin:hunter2@host:notaport";
        const result = sanitizeRedisError(message, "redis://host:notaport");
        expect(result).not.toContain("hunter2");
        expect(result).not.toContain("admin");
    });

    // A password containing a character that percent-encodes (@) must be
    // stripped whichever form (raw or encoded) it shows up in — the old
    // implementation only stripped the exact encoded value `new URL()`
    // yields, so a driver echoing the raw password would slip through.
    it("strips a credential in both its raw and percent-encoded form", () => {
        const redisUrl = buildRedisUrl({
            host: "h", port: "6379", username: "u", password: "p@ss", db: "", tls: false,
        });
        expect(redisUrl).toBe("redis://u:p%40ss@h:6379");

        const rawLeak = sanitizeRedisError("auth failed for password p@ss", redisUrl);
        expect(rawLeak).not.toContain("p@ss");

        const encodedLeak = sanitizeRedisError("auth failed for password p%40ss", redisUrl);
        expect(encodedLeak).not.toContain("p%40ss");
    });

    it("strips a plain redis:// URL's username and password from a message", () => {
        const message = "connect ECONNREFUSED at redis://user:pass@host:6379";
        const result = sanitizeRedisError(message, "redis://user:pass@host:6379");
        expect(result).not.toContain("user:pass");
        expect(result).not.toContain("user");
        expect(result).not.toContain("pass");
    });

    it("passes through a message with no URL in it, still readable", () => {
        const message = "ECONNREFUSED 127.0.0.1:6379";
        expect(sanitizeRedisError(message, "redis://localhost:6379")).toBe(message);
    });
});
