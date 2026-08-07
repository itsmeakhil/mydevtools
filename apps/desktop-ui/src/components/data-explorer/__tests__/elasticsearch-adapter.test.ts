// elasticsearch.tsx imports next-intl's useTranslations and (via its pane)
// @/components/ui/resizable — same mocks as the other adapter tests.
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
jest.mock("react-resizable-panels", () => ({
    Panel: () => null,
    PanelGroup: () => null,
    PanelResizeHandle: () => null,
}))

import { elasticsearchAdapter } from "../adapters/elasticsearch"
import {
    authHeader,
    mapElasticsearchError,
    prepareDocSource,
    prepareSearchBody,
    sanitizeElasticsearchError,
    type ElasticsearchConfig,
} from "@/lib/data-explorer/elasticsearch-api"

const base: ElasticsearchConfig = { baseUrl: "https://es.example.com:9200", authMode: "none" }

describe("elasticsearch adapter", () => {
    it("starts blank with no auth", () => {
        expect(elasticsearchAdapter.blankConfig()).toEqual({ baseUrl: "", authMode: "none" })
    })

    it("rejects bad configs with the right i18n keys", () => {
        expect(elasticsearchAdapter.validate({ baseUrl: "", authMode: "none" })).toBe(
            "validation.esUrlRequired",
        )
        expect(elasticsearchAdapter.validate({ baseUrl: "ftp://x", authMode: "none" })).toBe(
            "validation.esUrlScheme",
        )
        expect(elasticsearchAdapter.validate({ baseUrl: "not a url", authMode: "none" })).toBe(
            "validation.esUrlInvalid",
        )
        expect(elasticsearchAdapter.validate({ ...base, authMode: "basic" })).toBe(
            "validation.esUsernameRequired",
        )
        expect(elasticsearchAdapter.validate({ ...base, authMode: "apiKey" })).toBe(
            "validation.esApiKeyRequired",
        )
        expect(elasticsearchAdapter.validate({ ...base, authMode: "bearer" })).toBe(
            "validation.esBearerRequired",
        )
    })

    it("accepts valid configs across auth modes", () => {
        expect(elasticsearchAdapter.validate(base)).toBeNull()
        expect(
            elasticsearchAdapter.validate({ ...base, authMode: "basic", username: "elastic", password: "p" }),
        ).toBeNull()
        expect(elasticsearchAdapter.validate({ ...base, authMode: "apiKey", apiKey: "abc" })).toBeNull()
        expect(elasticsearchAdapter.validate({ ...base, authMode: "bearer", bearerToken: "tok" })).toBeNull()
    })

    it("builds the right Authorization header per mode", () => {
        expect(authHeader(base)).toBeNull()
        expect(authHeader({ ...base, authMode: "basic", username: "elastic", password: "pw" })).toBe(
            "Basic " + Buffer.from("elastic:pw").toString("base64"),
        )
        expect(authHeader({ ...base, authMode: "apiKey", apiKey: "SGVsbG8=" })).toBe("ApiKey SGVsbG8=")
        expect(authHeader({ ...base, authMode: "bearer", bearerToken: "tok" })).toBe("Bearer tok")
    })

    it("maps HTTP status + error type to typed kinds", () => {
        expect(mapElasticsearchError(401, {}).kind).toBe("auth")
        expect(mapElasticsearchError(403, {}).kind).toBe("forbidden")
        expect(
            mapElasticsearchError(404, { error: { type: "index_not_found_exception" } }).kind,
        ).toBe("notFound")
        expect(mapElasticsearchError(409, {}).kind).toBe("conflict")
        expect(mapElasticsearchError(400, { error: { type: "parsing_exception" } }).kind).toBe(
            "badQuery",
        )
        expect(mapElasticsearchError(500, {}).kind).toBe("unknown")
    })

    it("scrubs the Authorization credential from error text", () => {
        expect(sanitizeElasticsearchError("failed with Basic ZWxhc3RpYzpwdw== header")).toBe(
            "failed with Basic *** header",
        )
        expect(sanitizeElasticsearchError("ApiKey SGVsbG8gd29ybGQ= rejected")).toBe(
            "ApiKey *** rejected",
        )
    })

    it("wraps Lucene text in query_string and blank in match_all", () => {
        const luceneEmpty = prepareSearchBody({
            index: "i", mode: "lucene", queryString: "  ", dslText: "", size: 25, from: 0,
        })
        expect(luceneEmpty).toEqual({
            body: { query: { match_all: {} }, size: 25, from: 0, track_total_hits: true },
        })
        const lucene = prepareSearchBody({
            index: "i", mode: "lucene", queryString: "status:active", dslText: "", size: 10, from: 5,
        })
        expect((lucene as { body: Record<string, unknown> }).body.query).toEqual({
            query_string: { query: "status:active" },
        })
    })

    it("passes DSL through but injects paging when omitted", () => {
        const dsl = prepareSearchBody({
            index: "i", mode: "dsl", queryString: "", dslText: '{"query":{"term":{"a":1}}}', size: 25, from: 0,
        })
        expect(dsl).toEqual({
            body: { query: { term: { a: 1 } }, size: 25, from: 0, track_total_hits: true },
        })
        // Explicit size/from in the DSL win over the pane controls.
        const explicit = prepareSearchBody({
            index: "i", mode: "dsl", queryString: "", dslText: '{"size":3,"from":9}', size: 25, from: 0,
        })
        expect((explicit as { body: Record<string, unknown> }).body).toMatchObject({ size: 3, from: 9 })
        expect(prepareSearchBody({
            index: "i", mode: "dsl", queryString: "", dslText: "{bad", size: 25, from: 0,
        })).toEqual({ error: "invalidJson" })
        expect(prepareSearchBody({
            index: "i", mode: "dsl", queryString: "", dslText: "[1,2]", size: 25, from: 0,
        })).toEqual({ error: "notObject" })
    })

    it("validates document source is a JSON object", () => {
        expect(prepareDocSource('{"a":1}')).toEqual({ source: { a: 1 } })
        expect(prepareDocSource("{bad")).toEqual({ error: "invalidJson" })
        expect(prepareDocSource("[1]")).toEqual({ error: "notObject" })
        expect(prepareDocSource("42")).toEqual({ error: "notObject" })
    })

    // A misspelled key renders as a broken path to the user — assert every
    // key the adapter/pane can return resolves in en.json.
    it("returns only keys that resolve in messages/en.json", () => {
        const messages = require("../../../../messages/en.json")
        for (const key of [
            "validation.esUrlRequired",
            "validation.esUrlScheme",
            "validation.esUrlInvalid",
            "validation.esUsernameRequired",
            "validation.esApiKeyRequired",
            "validation.esBearerRequired",
        ]) {
            const resolved = key
                .split(".")
                .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part],
                    messages.DataExplorer)
            expect(typeof resolved).toBe("string")
            expect(resolved).not.toBe("")
        }
    })

    it("identifies itself consistently and satisfies the contract", () => {
        expect(elasticsearchAdapter.id).toBe("elasticsearch")
        expect(elasticsearchAdapter.label).toBe("Elasticsearch")
        expect(typeof elasticsearchAdapter.testConnection).toBe("function")
        expect(elasticsearchAdapter.ConnectionForm).toBeTruthy()
        expect(elasticsearchAdapter.SidebarTree).toBeTruthy()
        expect(elasticsearchAdapter.Pane).toBeTruthy()
    })
})
