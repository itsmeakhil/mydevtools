import { fetchGraphQLSchema } from "../graphql-introspect"

describe("fetchGraphQLSchema", () => {
    const originalFetch = global.fetch
    afterEach(() => {
        global.fetch = originalFetch
    })

    it("returns parsed schema on a 200 introspection response", async () => {
        const proxyBody = JSON.stringify({
            data: {
                __schema: {
                    queryType: { name: "Query" },
                    mutationType: { name: "Mutation" },
                    types: [
                        { kind: "OBJECT", name: "Query", fields: [{ name: "me", type: { name: "User" } }] },
                        { kind: "OBJECT", name: "User", fields: [{ name: "id", type: { name: "ID" } }] },
                        { kind: "OBJECT", name: "__InternalThing" }, // should be filtered
                    ],
                },
            },
        })
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => ({ status: 200, body: proxyBody, headers: {} }),
        }) as unknown as typeof fetch

        const out = await fetchGraphQLSchema({ url: "https://api.test/graphql" })
        expect(out.queryType).toBe("Query")
        expect(out.mutationType).toBe("Mutation")
        expect(out.types).toHaveLength(2)  // __InternalThing filtered
        expect(out.types[0].name).toBe("Query")
    })

    it("throws when the URL is empty", async () => {
        await expect(fetchGraphQLSchema({ url: "" })).rejects.toThrow("required")
    })

    it("throws on non-200 proxy response", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => ({ status: 500, body: "internal error", headers: {} }),
        }) as unknown as typeof fetch
        await expect(fetchGraphQLSchema({ url: "https://x.test" })).rejects.toThrow(/Introspection failed/)
    })

    it("throws when GraphQL response contains errors", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => ({
                status: 200,
                body: JSON.stringify({ errors: [{ message: "schema disabled" }] }),
                headers: {},
            }),
        }) as unknown as typeof fetch
        await expect(fetchGraphQLSchema({ url: "https://x.test" })).rejects.toThrow(/schema disabled/)
    })

    it("throws when the body isn't JSON", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => ({ status: 200, body: "<html>not json</html>", headers: {} }),
        }) as unknown as typeof fetch
        await expect(fetchGraphQLSchema({ url: "https://x.test" })).rejects.toThrow(/not JSON/)
    })
})
