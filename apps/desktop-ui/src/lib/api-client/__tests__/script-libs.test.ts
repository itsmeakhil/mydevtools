import { createHash, createHmac } from "node:crypto"
import { CryptoJS, scriptRequire } from "../script-libs"

describe("crypto-js shim", () => {
    it("matches known vectors", () => {
        expect(CryptoJS.SHA256("").toString()).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        expect(CryptoJS.SHA256("abc").toString()).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        expect(CryptoJS.MD5("").toString()).toBe("d41d8cd98f00b204e9800998ecf8427e")
        expect(CryptoJS.MD5("The quick brown fox jumps over the lazy dog").toString()).toBe("9e107d9d372bb6826bd81d3542a419d6")
        // RFC 4231 test case 2.
        expect(CryptoJS.HmacSHA256("what do ya want for nothing?", "Jefe").toString())
            .toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")
    })

    it("agrees with node:crypto across block boundaries, unicode and long keys", () => {
        for (const len of [0, 1, 55, 56, 63, 64, 65, 119, 1000]) {
            const msg = "é✓".repeat(len)
            expect(CryptoJS.SHA256(msg).toString()).toBe(createHash("sha256").update(msg).digest("hex"))
            expect(CryptoJS.MD5(msg).toString()).toBe(createHash("md5").update(msg).digest("hex"))
            const key = "k".repeat(len)
            expect(CryptoJS.HmacSHA256(msg, key).toString()).toBe(createHmac("sha256", key).update(msg).digest("hex"))
        }
    })

    it("encoders round-trip and format digests", () => {
        const wa = CryptoJS.enc.Utf8.parse("user:pässword")
        expect(CryptoJS.enc.Base64.stringify(wa)).toBe(Buffer.from("user:pässword").toString("base64"))
        expect(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse("aGk="))).toBe("hi")
        expect(CryptoJS.enc.Hex.parse("6869").toString(CryptoJS.enc.Utf8)).toBe("hi")
        expect(CryptoJS.SHA256("abc").toString(CryptoJS.enc.Base64)).toBe(createHash("sha256").update("abc").digest("base64"))
        expect(CryptoJS.HmacSHA256(wa, CryptoJS.enc.Hex.parse("00ff")).sigBytes).toBe(32)
    })
})

describe("scriptRequire", () => {
    it("serves uuid and crypto-js", () => {
        expect((scriptRequire("uuid") as { v4: () => string }).v4()).toMatch(/^[0-9a-f-]{36}$/)
        expect(scriptRequire("crypto-js")).toBe(CryptoJS)
    })

    it("names what is available for unknown modules", () => {
        expect(() => scriptRequire("lodash")).toThrow("Cannot find module 'lodash' — scripts can require: uuid, crypto-js")
        expect(() => scriptRequire("toString")).toThrow(/Cannot find module/)
    })
})
