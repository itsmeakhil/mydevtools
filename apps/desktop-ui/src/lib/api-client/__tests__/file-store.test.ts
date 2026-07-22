import {
    countLiteralAuthSecrets,
    diffFiles,
    parseCollection,
    serializeCollection,
    slugify,
    MANIFEST_FILE,
} from "../file-store"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
} from "@/components/api-client/types"

const kv = (key: string, value: string, active = true) => ({
    id: `kv-${key}`,
    key,
    value,
    active,
})

const request = (over: Partial<CollectionRequest> = {}): CollectionRequest => ({
    id: "req-1",
    name: "Login",
    method: "POST",
    url: "https://api.example.com/login",
    params: [kv("verbose", "1")],
    headers: [kv("X-Token", "{{vault.apiToken}}")],
    body: { type: "json", content: '{"a":1}' },
    auth: { type: "bearer", token: "{{vault.apiToken}}" },
    preRequestScript: "console.log('pre')",
    ...over,
})

const collection = (): Collection => {
    const folder: CollectionFolder = {
        id: "folder-1",
        name: "Auth",
        type: "folder",
        isOpen: true,
        items: [request(), request({ id: "req-2", name: "Refresh", url: "https://api.example.com/refresh" })],
        defaultHeaders: [kv("X-Env", "staging")],
        testScript: "pm.test('ok', () => {})",
    }
    return {
        id: "col-1",
        name: "My API",
        items: [folder, request({ id: "req-3", name: "Health", method: "GET", url: "https://api.example.com/health" })],
    }
}

/** Strip volatile fields the store legitimately drops/regenerates. */
const canonical = (col: Collection) =>
    JSON.parse(
        JSON.stringify(col, (key, value) => {
            if (key === "id" && typeof value === "string" && value.startsWith("kv-")) return undefined
            if (key === "isOpen") return undefined
            return value
        })
    )

describe("file-store", () => {
    test("round-trip preserves the tree (minus stripped fields)", () => {
        const col = collection()
        const { collection: parsed, warnings } = parseCollection(serializeCollection(col))
        expect(warnings).toEqual([])
        expect(canonicalTree(parsed)).toEqual(canonicalTree(col))
    })

    test("serialization is deterministic (byte-identical on repeat)", () => {
        const a = serializeCollection(collection())
        const b = serializeCollection(collection())
        expect(b).toEqual(a)
    })

    test("stable ids survive the round-trip", () => {
        const { collection: parsed } = parseCollection(serializeCollection(collection()))
        const folder = parsed.items[0] as CollectionFolder
        expect(parsed.id).toBe("col-1")
        expect(folder.id).toBe("folder-1")
        expect(folder.items.map((i) => i.id)).toEqual(["req-1", "req-2"])
    })

    test("secret tokens are written verbatim, never resolved", () => {
        const files = serializeCollection(collection())
        const all = files.map((f) => f.content).join("\n")
        expect(all).toContain("{{vault.apiToken}}")
    })

    test("literal credentials are redacted; vault tokens and non-secret fields survive", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [
                request({
                    id: "r1",
                    name: "AWS",
                    auth: {
                        type: "aws-sigv4",
                        awsSigV4: {
                            accessKeyId: "AKIA123",
                            secretAccessKey: "SUPER-SECRET-LITERAL",
                            region: "us-east-1",
                            service: "s3",
                        },
                    },
                }),
                request({
                    id: "r2",
                    name: "Bearer literal",
                    auth: { type: "bearer", token: "eyJhbGciOi-literal-jwt" },
                }),
                request({
                    id: "r3",
                    name: "Bearer vaulted",
                    auth: { type: "bearer", token: "{{vault.apiToken}}" },
                }),
                request({
                    id: "r4",
                    name: "OAuth",
                    auth: {
                        type: "oauth2",
                        oauth2: {
                            grantType: "client_credentials",
                            tokenUrl: "https://idp/token",
                            clientId: "public-client-id",
                            clientSecret: "literal-client-secret",
                            accessToken: "cached-access-token",
                        },
                    },
                }),
            ],
        }
        const all = serializeCollection(col).map((f) => f.content).join("\n")
        expect(all).not.toContain("SUPER-SECRET-LITERAL")
        expect(all).not.toContain("eyJhbGciOi-literal-jwt")
        expect(all).not.toContain("literal-client-secret")
        expect(all).not.toContain("cached-access-token")
        expect(all).toContain("AKIA123") // access key id is not the secret half
        expect(all).toContain("public-client-id")
        expect(all).toContain("{{vault.apiToken}}")
        expect(countLiteralAuthSecrets(col)).toBe(3)
    })

    test("folder defaultAuth is redacted too", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [
                {
                    id: "f",
                    name: "F",
                    type: "folder",
                    items: [],
                    defaultAuth: { type: "basic", username: "bob", password: "hunter2" },
                },
            ],
        }
        const all = serializeCollection(col).map((f) => f.content).join("\n")
        expect(all).not.toContain("hunter2")
        expect(all).toContain("bob")
        expect(countLiteralAuthSecrets(col)).toBe(1)
    })

    test("isOpen and KeyValueItem ids never reach disk", () => {
        const all = serializeCollection(collection()).map((f) => f.content).join("\n")
        expect(all).not.toContain("isOpen")
        expect(all).not.toContain("kv-")
    })

    test("sibling order comes from filename prefix", () => {
        const files = serializeCollection(collection())
        const paths = files.map((f) => f.relPath)
        expect(paths).toContain("001-auth/001-login.yaml")
        expect(paths).toContain("001-auth/002-refresh.yaml")
        expect(paths).toContain("002-health.yaml")
        const { collection: parsed } = parseCollection(files)
        expect(parsed.items.map((i) => i.name)).toEqual(["Auth", "Health"])
        expect((parsed.items[0] as CollectionFolder).items.map((i) => i.name)).toEqual(["Login", "Refresh"])
    })

    test("duplicate names stay unique via the index prefix", () => {
        const col: Collection = {
            id: "c",
            name: "c",
            items: [
                request({ id: "a", name: "Same" }),
                request({ id: "b", name: "same" }),
            ],
        }
        const paths = serializeCollection(col).map((f) => f.relPath)
        expect(paths).toContain("001-same.yaml")
        expect(paths).toContain("002-same.yaml")
        expect(slugify("Héllo Wörld!")).toBe("hello-world")
        expect(slugify("///")).toBe("item")
    })

    test("garbage files are skipped with warnings, not fatal", () => {
        const files = serializeCollection(collection())
        files.push({ relPath: "junk.yaml", content: "[not: a: mapping" })
        const { collection: parsed, warnings } = parseCollection(files)
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain("junk.yaml")
        expect(parsed.items).toHaveLength(2)
    })

    test("missing manifest throws", () => {
        const files = serializeCollection(collection()).filter((f) => f.relPath !== MANIFEST_FILE)
        expect(() => parseCollection(files)).toThrow("missing-manifest")
    })

    test("diffFiles: no-op mutation produces zero writes", () => {
        const a = serializeCollection(collection())
        const b = serializeCollection(collection())
        expect(diffFiles(a, b)).toEqual({ writes: [], deletes: [] })
    })

    test("diffFiles: rename rewrites only the affected file", () => {
        const before = serializeCollection(collection())
        const col = collection()
        ;(col.items[1] as CollectionRequest).name = "Healthcheck"
        const after = serializeCollection(col)
        const { writes, deletes } = diffFiles(before, after)
        expect(deletes).toEqual(["002-health.yaml"])
        expect(writes.map((w) => w.relPath)).toEqual(["002-healthcheck.yaml"])
    })

    test("diffFiles: delete removes the subtree files", () => {
        const before = serializeCollection(collection())
        const col = collection()
        col.items = col.items.slice(1) // drop the Auth folder
        const after = serializeCollection(col)
        const { deletes, writes } = diffFiles(before, after)
        expect(deletes.sort()).toEqual([
            "001-auth/001-login.yaml",
            "001-auth/002-refresh.yaml",
            "001-auth/folder.yaml",
            "002-health.yaml", // renumbered to 001-
        ])
        expect(writes.map((w) => w.relPath)).toEqual(["001-health.yaml"])
    })
})

/** Comparable shape: drop generated KV ids and UI-only isOpen on both sides. */
function canonicalTree(col: Collection) {
    return JSON.parse(
        JSON.stringify(col, function (this: Record<string, unknown>, key: string, value: unknown) {
            if (key === "isOpen") return undefined
            if (
                key === "id" &&
                typeof value === "string" &&
                "key" in this &&
                "value" in this &&
                "active" in this
            ) {
                return undefined
            }
            return value
        })
    )
}
