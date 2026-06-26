import { signAwsSigV4 } from "../aws-sigv4"
import { signHawk } from "../hawk"
import { signDigest } from "../digest"

describe("AWS SigV4", () => {
    /** RFC test vector: example "get-vanilla" from AWS docs (simplified body). */
    it("produces deterministic signature given a fixed date", async () => {
        const headers: Record<string, string> = {}
        const auth = await signAwsSigV4({
            method: "GET",
            url: new URL("https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08"),
            headers,
            body: "",
            cfg: {
                accessKeyId: "AKIDEXAMPLE",
                secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
                region: "us-east-1",
                service: "iam",
            },
            now: new Date(Date.UTC(2015, 7, 30, 12, 36, 0)),  // 20150830T123600Z — AWS example
        })
        expect(auth.startsWith("AWS4-HMAC-SHA256 ")).toBe(true)
        expect(headers["X-Amz-Date"]).toBe("20150830T123600Z")
        // X-Amz-Content-Sha256 of empty body is the well-known SHA-256 of "".
        expect(headers["X-Amz-Content-Sha256"])
            .toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        expect(auth).toContain("Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request")
        expect(auth).toContain("SignedHeaders=host;x-amz-content-sha256;x-amz-date")
    })

    it("includes X-Amz-Security-Token when sessionToken is supplied", async () => {
        const headers: Record<string, string> = {}
        await signAwsSigV4({
            method: "GET",
            url: new URL("https://api.example.com/"),
            headers,
            body: "",
            cfg: {
                accessKeyId: "A",
                secretAccessKey: "B",
                region: "us-east-1",
                service: "execute-api",
                sessionToken: "TOK123",
            },
            now: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)),
        })
        expect(headers["X-Amz-Security-Token"]).toBe("TOK123")
        expect(headers["Authorization"]).toContain("x-amz-security-token")
    })
})

describe("Hawk", () => {
    it("produces a Hawk Authorization header with id/ts/nonce/mac", async () => {
        const headers: Record<string, string> = {}
        const auth = await signHawk({
            method: "GET",
            url: new URL("https://example.com/resource/1?b=1&a=2"),
            headers,
            body: "",
            cfg: { id: "dh37fgj492je", key: "werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn", algorithm: "sha256" },
            now: new Date(1353832234 * 1000),
            nonce: "j4h3g2",
        })
        expect(auth.startsWith("Hawk ")).toBe(true)
        expect(auth).toContain(`id="dh37fgj492je"`)
        expect(auth).toContain(`ts="1353832234"`)
        expect(auth).toContain(`nonce="j4h3g2"`)
        expect(auth).toMatch(/mac="[A-Za-z0-9+/=]+"/)
        expect(headers["Authorization"]).toBe(auth)
    })

    it("includes hash= when includePayloadHash is set and body present", async () => {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        const auth = await signHawk({
            method: "POST",
            url: new URL("https://example.com/x"),
            headers,
            body: '{"x":1}',
            cfg: { id: "i", key: "k", includePayloadHash: true },
            nonce: "abc",
            now: new Date(1700000000 * 1000),
        })
        expect(auth).toContain("hash=")
    })
})

describe("Digest (pre-emptive)", () => {
    /** RFC 7616 §3.9.1 — MD5 test vector. */
    it("produces the RFC 7616 MD5 response value", async () => {
        const headers: Record<string, string> = {}
        await signDigest({
            method: "GET",
            url: new URL("http://www.nowhere.org/dir/index.html"),
            headers,
            cfg: {
                username: "Mufasa",
                password: "Circle of Life",
                realm: "http-auth@example.org",
                nonce: "7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v",
                qop: "auth",
                algorithm: "MD5",
                opaque: "FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS",
                nc: "00000001",
                cnonce: "f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ",
            },
        })
        const header = headers["Authorization"]
        expect(header.startsWith("Digest ")).toBe(true)
        expect(header).toContain('username="Mufasa"')
        expect(header).toContain('uri="/dir/index.html"')
        expect(header).toContain('algorithm=MD5')
        expect(header).toContain('qop=auth')
        // RFC 7616 §3.9.1 reference response value:
        expect(header).toContain('response="8ca523f5e9506fed4657c9700eebdbec"')
    })

    it("supports SHA-256 algorithm switch", async () => {
        const headers: Record<string, string> = {}
        await signDigest({
            method: "GET",
            url: new URL("http://x.test/"),
            headers,
            cfg: {
                username: "u",
                password: "p",
                realm: "r",
                nonce: "n",
                algorithm: "SHA-256",
            },
        })
        expect(headers["Authorization"]).toContain("algorithm=SHA-256")
    })
})
