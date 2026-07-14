/**
 * jest-environment-node doesn't ship CompressionStream/DecompressionStream.
 * The share-link helper falls back to identity transforms when missing, so the
 * round-trip still verifies the JSON + base64url + URL boundaries.
 */

import {
    encodeCollectionShareFragment,
    decodeCollectionShareFragment,
    buildShareUrl,
} from "../share-link"
import type { Collection } from "@/components/api-client/types"

const sample: Collection = {
    id: "c1",
    name: "Demo",
    items: [
        {
            id: "r1",
            name: "List users",
            method: "GET",
            url: "https://api.test/users",
            params: [],
            headers: [],
            body: { type: "none", content: "" },
            auth: { type: "none" },
        },
    ],
}

describe("share-link", () => {
    it("round-trips a collection through encode → decode", async () => {
        const frag = await encodeCollectionShareFragment(sample)
        const back = await decodeCollectionShareFragment(frag)
        expect(back.name).toBe("Demo")
        expect(back.items).toHaveLength(1)
        expect(back.items[0].name).toBe("List users")
    })

    it("encoded fragment is URL-safe (no `+`, `/`, `=`)", async () => {
        const frag = await encodeCollectionShareFragment(sample)
        expect(frag).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it("buildShareUrl includes the fragment after `#`", async () => {
        const url = await buildShareUrl("https://mydevtools.tech/", sample)
        expect(url).toMatch(/^https:\/\/mydevtools\.tech\/api-client\/share#[A-Za-z0-9_-]+$/)
    })

    it("rejects payloads beyond the cap", async () => {
        const big: Collection = {
            id: "x", name: "Big",
            items: Array.from({ length: 5000 }, (_, i) => ({
                id: `r-${i}`,
                name: `req ${i}`.repeat(20),
                method: "GET" as const,
                url: "https://api.test/" + "x".repeat(500),
                params: [],
                headers: [],
                body: { type: "none" as const, content: "" },
                auth: { type: "none" as const },
            })),
        }
        await expect(encodeCollectionShareFragment(big)).rejects.toThrow(/too large/)
    })

    it("decode rejects garbage", async () => {
        await expect(decodeCollectionShareFragment("")).rejects.toThrow()
        // Non-gzip base64url should fail at the decompress / JSON stage.
        const bad = btoa('{"hello":"world"}').replace(/=+$/, "")
        await expect(decodeCollectionShareFragment(bad)).rejects.toThrow()
    })
})
