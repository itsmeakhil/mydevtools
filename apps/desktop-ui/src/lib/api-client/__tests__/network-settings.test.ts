jest.mock("@/lib/user-preferences-api", () => ({
    getUserPreferences: jest.fn(async () => ({
        apiClientNetwork: {
            certs: [{ id: "g", host: "*", type: "pem", certPath: "/global.pem" }],
            caPaths: ["/global-ca.pem"],
            proxy: { mode: "manual", url: "socks5://127.0.0.1:1080", password: "pw" },
        },
    })),
}))

import { collectionNet, invalidateGlobalNetwork, mergeNet, redactCertsForFile, withGlobalNet, type ClientCertEntry } from "../network-settings"
import { parseCollection, redactCollectionAuth, serializeCollection } from "../file-store"
import type { Collection } from "@/components/api-client/types"

const pfx: ClientCertEntry = { id: "c1", host: "*.corp.test", type: "pfx", pfxPath: "/id.pfx", passphrase: "{{vault.pfx}}", certPath: "/ignored.pem" }
const pem: ClientCertEntry = { id: "c2", host: "api.test:8443", type: "pem", certPath: "/c.pem", keyPath: "/k.pem", passphrase: "unused" }

describe("collectionNet / mergeNet", () => {
    it("sends only the fields of the entry's type and resolves passphrases", () => {
        const net = collectionNet({ certs: [pfx, pem], caPaths: ["/ca.pem"] }, (s) => s.replace("{{vault.pfx}}", "s3cret"))
        expect(net.certs).toEqual([
            { host: "*.corp.test", enabled: undefined, pfxPath: "/id.pfx", passphrase: "s3cret" },
            { host: "api.test:8443", enabled: undefined, certPath: "/c.pem", keyPath: "/k.pem" },
        ])
        expect(net.caPaths).toEqual(["/ca.pem"])
    })

    it("puts collection entries before global ones and takes the proxy from global", () => {
        const merged = mergeNet(
            { certs: [{ id: "g", host: "*", type: "pem", certPath: "/g.pem" }], caPaths: ["/g-ca.pem"], proxy: { mode: "off" } },
            collectionNet({ certs: [pem], caPaths: ["/c-ca.pem"] }),
        )
        expect(merged.certs.map((c) => c.host)).toEqual(["api.test:8443", "*"])
        expect(merged.caPaths).toEqual(["/c-ca.pem", "/g-ca.pem"])
        expect(merged.proxy).toEqual({ mode: "off" })
        expect(mergeNet(undefined, undefined)).toEqual({ certs: [], caPaths: [], proxy: undefined })
    })

    it("withGlobalNet merges the stored preferences into a request", async () => {
        invalidateGlobalNetwork()
        const input = await withGlobalNet({ url: "https://x.test", net: collectionNet({ certs: [pem] }) })
        expect(input.url).toBe("https://x.test")
        expect(input.net.certs.map((c) => c.host)).toEqual(["api.test:8443", "*"])
        expect(input.net.caPaths).toEqual(["/global-ca.pem"])
        expect(input.net.proxy?.url).toBe("socks5://127.0.0.1:1080")
    })
})

describe("secrets never reach files or share links", () => {
    it("keeps only {{variable}} passphrases for files", () => {
        expect(redactCertsForFile([pfx, { ...pfx, id: "c3", passphrase: "literal-pw" }])).toEqual([
            pfx,
            { id: "c3", host: "*.corp.test", type: "pfx", pfxPath: "/id.pfx", certPath: "/ignored.pem" },
        ])
        expect(redactCertsForFile([])).toBeUndefined()
    })

    const col: Collection = {
        id: "col", name: "Corp", items: [],
        clientCerts: [{ ...pfx, passphrase: "LITERAL-PFX-PASS" }, pem],
        caPaths: ["/ca.pem"],
    }

    it("collection.yaml round-trips paths and hosts without literal passphrases", () => {
        const files = serializeCollection(col)
        const yaml = files.map((f) => f.content).join("\n")
        expect(yaml).not.toContain("LITERAL-PFX-PASS")
        expect(yaml).not.toContain("unused")
        const back = parseCollection(files).collection
        expect(back.clientCerts?.map((c) => [c.host, c.type, c.pfxPath ?? c.certPath])).toEqual([
            ["*.corp.test", "pfx", "/id.pfx"],
            ["api.test:8443", "pem", "/c.pem"],
        ])
        expect(back.caPaths).toEqual(["/ca.pem"])
    })

    it("share links drop certificate entries entirely", () => {
        const shared = redactCollectionAuth(col)
        expect(shared.clientCerts).toBeUndefined()
        expect(shared.caPaths).toBeUndefined()
    })
})
