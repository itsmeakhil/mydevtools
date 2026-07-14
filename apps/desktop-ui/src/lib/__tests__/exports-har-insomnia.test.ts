import { exportCollectionAsHar } from "../export/har"
import { exportCollectionAsInsomnia } from "../export/insomnia"
import { importHar } from "../import/har"
import type { Collection, CollectionRequest } from "@/components/api-client/types"

const req = (over: Partial<CollectionRequest>): CollectionRequest => ({
    id: crypto.randomUUID(),
    name: "r",
    method: "GET",
    url: "https://api.test/x",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    ...over,
})

const col: Collection = {
    id: "c1",
    name: "Demo",
    items: [
        req({
            method: "POST",
            url: "https://api.test/users",
            name: "Create user",
            headers: [{ id: "h", key: "X-Trace", value: "abc", active: true }],
            body: { type: "json", content: '{"name":"alice"}' },
            auth: { type: "bearer", token: "tok" },
        }),
        {
            id: "f1", name: "Group", type: "folder",
            items: [req({ method: "GET", url: "https://api.test/users/1", name: "Get user" })],
        },
    ],
}

describe("HAR export", () => {
    it("produces HAR 1.2 with all requests as entries", () => {
        const har = JSON.parse(exportCollectionAsHar(col))
        expect(har.log.version).toBe("1.2")
        expect(har.log.creator.name).toContain("mydevtools")
        expect(har.log.entries).toHaveLength(2)
        expect(har.log.entries[0].request.method).toBe("POST")
        expect(har.log.entries[0].request.postData.mimeType).toBe("application/json")
    })

    it("round-trips through importHar (best-effort — auth is not preserved)", () => {
        const har = exportCollectionAsHar(col)
        const reimported = importHar(har)
        expect(reimported.items).toHaveLength(2)
    })
})

describe("Insomnia v4 export", () => {
    it("emits an export wrapper with workspace + flattened resources", () => {
        const ins = JSON.parse(exportCollectionAsInsomnia(col))
        expect(ins._type).toBe("export")
        expect(ins.__export_format).toBe(4)
        const types = ins.resources.map((r: { _type: string }) => r._type)
        expect(types[0]).toBe("workspace")
        expect(types).toContain("request_group")
        expect(types).toContain("request")
    })

    it("encodes bearer auth", () => {
        const ins = JSON.parse(exportCollectionAsInsomnia(col))
        const r = ins.resources.find((x: { _type: string; name?: string }) => x._type === "request" && x.name === "Create user")
        expect(r.authentication).toEqual({ type: "bearer", token: "tok" })
    })
})
