import { generateCode } from "../generate-code"
import type { ApiRequestState } from "../types"

function gqlRequest(graphqlVariables?: string): ApiRequestState {
    return {
        method: "POST",
        url: "https://api.example.com/graphql",
        headers: [],
        params: [],
        auth: { type: "none" },
        body: { type: "graphql", content: "query { me { id } }", graphqlVariables },
    } as unknown as ApiRequestState
}

describe("generateCode graphql body", () => {
    it("serialises query + variables as JSON with application/json", () => {
        const curl = generateCode(gqlRequest('{"id": 1}'), "curl")
        expect(curl).toContain('"query":"query { me { id } }"')
        expect(curl).toContain('"variables":{"id":1}')
        expect(curl).toContain("Content-Type: application/json")
    })

    it("emits query-only payload when variables missing or invalid", () => {
        for (const vars of [undefined, "not json"]) {
            const curl = generateCode(gqlRequest(vars), "curl")
            expect(curl).toContain('{"query":"query { me { id } }"}')
            expect(curl).not.toContain('"variables"')
        }
    })
})
