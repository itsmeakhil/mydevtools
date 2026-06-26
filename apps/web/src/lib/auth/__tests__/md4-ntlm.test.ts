import { md4 } from "../md4"
import { md5Bytes, hmacMd5 } from "../md5-bytes"
import { createType1Message, createType3Message, parseType2Message } from "../ntlm"

function toHex(b: Uint8Array): string {
    return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("")
}

describe("md4 — RFC 1320 test suite", () => {
    const v: Array<[string, string]> = [
        ["", "31d6cfe0d16ae931b73c59d7e0c089c0"],
        ["a", "bde52cb31de33e46245e05fbdbd6fb24"],
        ["abc", "a448017aaf21d8525fc10ae87aa6729d"],
        ["message digest", "d9130a8164549fe818874806e1c7014b"],
        ["abcdefghijklmnopqrstuvwxyz", "d79e1c308aa5bbcdeea8ed63df412da9"],
    ]
    for (const [input, expected] of v) {
        it(`md4(${JSON.stringify(input)}) → ${expected}`, () => {
            expect(toHex(md4(new TextEncoder().encode(input)))).toBe(expected)
        })
    }
})

describe("md5Bytes — RFC 1321 vectors", () => {
    it("empty", () => {
        expect(toHex(md5Bytes(new Uint8Array(0)))).toBe("d41d8cd98f00b204e9800998ecf8427e")
    })
    it("abc", () => {
        expect(toHex(md5Bytes(new TextEncoder().encode("abc"))))
            .toBe("900150983cd24fb0d6963f7d28e17f72")
    })
})

describe("HMAC-MD5 — RFC 2202 vectors", () => {
    it('key=0x0b×16, data="Hi There"', () => {
        const key = new Uint8Array(16).fill(0x0b)
        const data = new TextEncoder().encode("Hi There")
        expect(toHex(hmacMd5(key, data))).toBe("9294727a3638bb1c13f48ef8158bfc9d")
    })
    it('key="Jefe", data="what do ya want for nothing?"', () => {
        const key = new TextEncoder().encode("Jefe")
        const data = new TextEncoder().encode("what do ya want for nothing?")
        expect(toHex(hmacMd5(key, data))).toBe("750c783e6ab0b503eaa86e310a5db738")
    })
})

describe("NTLM messages", () => {
    it("Type1 starts with NTLMSSP signature + type=0x01", () => {
        const b64 = createType1Message()
        const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        // signature
        expect(Array.from(raw.slice(0, 8))).toEqual([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00])
        // message type = 1 (LE)
        expect(raw[8]).toBe(0x01)
        expect(raw[9]).toBe(0x00)
    })

    it("Type2 parser extracts the 8-byte server challenge", () => {
        // Hand-crafted minimal Type2: signature + type=2 + 12-byte TargetName SecBuf (zero) +
        // flags(4) + serverChallenge(8) + reserved(8) + TargetInfo SecBuf (zero) at offset 40
        const buf = new Uint8Array(48)
        buf.set([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00], 0)
        buf[8] = 0x02
        // TargetName SecurityBuffer: all zero (len=0, max=0, offset=0)
        // Flags @ 20: leave zero
        // ServerChallenge @ 24: 0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef
        buf.set([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef], 24)
        // TargetInfo SecurityBuffer @ 40: len=0, max=0, offset=48 (past end → 0 bytes returned)
        const b64 = btoa(String.fromCharCode(...buf))
        const parsed = parseType2Message(b64)
        expect(toHex(parsed.serverChallenge)).toBe("0123456789abcdef")
        expect(parsed.targetInfo.length).toBe(0)
    })

    it("Type3 is built and base64-decodes back to a valid NTLMSSP frame", () => {
        // Build a small Type2 first to feed Type3.
        const buf = new Uint8Array(48)
        buf.set([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00], 0)
        buf[8] = 0x02
        buf.set([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef], 24)
        const type2B64 = btoa(String.fromCharCode(...buf))
        const type2 = parseType2Message(type2B64)

        const t3 = createType3Message({
            type2,
            username: "user",
            password: "SecREt01",
            domain: "DOMAIN",
            workstation: "COMPUTER",
            timestamp: BigInt(0),
            clientChallenge: new Uint8Array(8).fill(0xaa),
        })
        const decoded = Uint8Array.from(atob(t3), (c) => c.charCodeAt(0))
        expect(Array.from(decoded.slice(0, 8))).toEqual([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00])
        expect(decoded[8]).toBe(0x03)
    })
})
