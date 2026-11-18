/**
 * packages/cli/COLLECTION-FORMAT.md is what people and coding agents author
 * collections from. Fail when file-store starts writing something the doc
 * doesn't mention.
 */
import { readFileSync } from "fs"
import path from "path"
import { load } from "js-yaml"
import { KEY_ORDER, serializeCollection } from "../file-store"
import { ASSERTION_OPERATORS } from "../assertions"
import type { Collection, RequestAuth, RequestBody } from "@/components/api-client/types"

const doc = readFileSync(path.join(__dirname, "../../../../../../packages/cli/COLLECTION-FORMAT.md"), "utf8")
const documented = (word: string) => doc.includes(`\`${word}\``)

// Exhaustive at compile time: a new union member is a type error here until listed.
const BODY_TYPES: Record<RequestBody["type"], true> = {
    json: true, text: true, xml: true, none: true, "form-data": true, "x-www-form-urlencoded": true, graphql: true, binary: true,
}
const AUTH_TYPES: Record<RequestAuth["type"], true> = {
    none: true, inherit: true, bearer: true, basic: true, "api-key": true, oauth2: true, "aws-sigv4": true,
    hawk: true, digest: true, ntlm: true, "jwt-bearer": true, spnego: true,
}

const kv = (key: string, value: string) => ({ id: key, key, value, active: true })
/** Every field file-store knows how to write, set. */
const maximal: Collection = {
    id: "c", name: "C",
    defaultHeaders: [kv("X-A", "1")], defaultAuth: { type: "bearer", token: "{{t}}" }, variables: [kv("v", "1")],
    preRequestScript: "1", testScript: "1",
    items: [
        { id: "f", name: "F", type: "folder", items: [], defaultHeaders: [kv("X-B", "1")], defaultAuth: { type: "basic", username: "u", password: "{{p}}" }, preRequestScript: "1", testScript: "1" },
        {
            id: "r", name: "R", kind: "websocket", method: "PURGE", url: "http://x", params: [kv("q", "1")], headers: [kv("H", "1")],
            omitHeaders: ["X-A"], body: { type: "json", content: "{}" }, auth: { type: "inherit" },
            timeoutMs: 1, useCookieJar: false, followRedirects: false, maxRedirects: 1, verifySsl: false,
            assertions: [{ id: "a", enabled: true, target: "res.status", operator: "eq", value: "200" }],
            preRequestScript: "1", testScript: "1",
            websocket: { status: "idle", messages: [], draft: "hi", protocols: "p" },
            grpc: { protoSource: "x", requestJson: "{}" } as never,
            examples: [{ id: "e", name: "E", capturedAt: 1, request: { method: "GET", url: "x" }, response: { status: 200 } } as never],
        },
    ],
}

describe("COLLECTION-FORMAT.md", () => {
    it("documents every top-level key file-store orders", () => {
        expect(KEY_ORDER.filter((k) => !documented(k))).toEqual([])
    })

    it("documents every top-level key file-store actually writes", () => {
        const written = new Set<string>()
        for (const f of serializeCollection(maximal)) {
            Object.keys(load(f.content) as object).forEach((k) => written.add(k))
        }
        expect([...written].filter((k) => !documented(k))).toEqual([])
    })

    it("documents every body type, auth type and assertion operator", () => {
        const missing = [...Object.keys(BODY_TYPES), ...Object.keys(AUTH_TYPES), ...ASSERTION_OPERATORS]
            .filter((t) => t !== "none" && !documented(t))
        expect(missing).toEqual([])
    })
})
