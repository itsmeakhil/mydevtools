import { hopKind, maskHeaderValue } from "../timeline"
import type { TimelineHop } from "@/components/api-client/types"

describe("maskHeaderValue", () => {
    it("keeps the auth scheme and hides the credential", () => {
        expect(maskHeaderValue("Authorization", "Bearer abc.def")).toBe("Bearer ••••••")
        expect(maskHeaderValue("authorization", 'Digest username="u", response="x"')).toBe("Digest ••••••")
        expect(maskHeaderValue("Proxy-Authorization", "Basic dTpw")).toBe("Basic ••••••")
    })

    it("hides cookies and scheme-less tokens entirely", () => {
        expect(maskHeaderValue("Cookie", "session=s3cret; theme=dark")).toBe("••••••")
        expect(maskHeaderValue("Authorization", "s3cret")).toBe("••••••")
    })

    it("leaves other headers alone", () => {
        expect(maskHeaderValue("Content-Type", "application/json")).toBe("application/json")
    })
})

describe("hopKind", () => {
    const hop = (status: number): TimelineHop => ({ method: "GET", url: "u", status, startMs: 0, ttfbMs: 1, headers: [] })

    it("labels redirects, digest challenges and the final response", () => {
        const hops = [hop(302), hop(401), hop(200)]
        expect(hops.map((_, i) => hopKind(hops, i))).toEqual(["redirect", "authChallenge", "final"])
        // A 401 that is the last hop is the final answer, not a challenge.
        expect(hopKind([hop(401)], 0)).toBe("final")
    })
})
