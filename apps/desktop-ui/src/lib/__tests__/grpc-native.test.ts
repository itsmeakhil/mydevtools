import { sendNativeGrpc, encodeMessageFrame, bytesToBase64 } from "../grpc-web"

describe("sendNativeGrpc", () => {
    const originalFetch = global.fetch
    afterEach(() => { global.fetch = originalFetch })

    it("posts to /api/proxy-grpc with base64 frame body", async () => {
        const captured: { url?: string; body?: string } = {}
        global.fetch = jest.fn().mockImplementation(async (url: string, init: RequestInit) => {
            captured.url = url
            captured.body = init.body as string
            // Echo back a single response frame + trailer.
            const responseMessage = new Uint8Array([10, 11, 12])
            const responseFrame = encodeMessageFrame(responseMessage)
            return {
                ok: true,
                json: async () => ({
                    status: 200,
                    body: bytesToBase64(responseFrame),
                    headers: { "content-type": "application/grpc" },
                    trailers: { "grpc-status": "0", "grpc-message": "OK" },
                    grpcStatus: 0,
                    grpcMessage: "OK",
                    timeMs: 5,
                    sizeBytes: responseFrame.length,
                }),
            }
        }) as unknown as typeof fetch

        const result = await sendNativeGrpc({
            url: "https://grpc.test/pkg.Svc/Method",
            message: new Uint8Array([1, 2, 3]),
            extraHeaders: { authorization: "Bearer t" },
        })

        expect(captured.url).toBe("/api/proxy-grpc")
        const sent = JSON.parse(captured.body!)
        expect(sent.url).toBe("https://grpc.test/pkg.Svc/Method")
        expect(sent.headers).toEqual({ authorization: "Bearer t" })
        // The body sent to the proxy is base64 of the framed request.
        const sentFrame = atob(sent.body)
        expect(sentFrame.length).toBe(5 + 3)

        expect(result.grpcStatus).toBe(0)
        expect(result.grpcMessage).toBe("OK")
        expect(result.messages).toHaveLength(1)
        expect(Array.from(result.messages[0])).toEqual([10, 11, 12])
    })

    it("throws on proxy-level error envelope", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 502,
            json: async () => ({ error: "Blocked by SSRF protection", body: "", headers: {}, trailers: {} }),
        }) as unknown as typeof fetch
        await expect(sendNativeGrpc({ url: "x", message: new Uint8Array(0) })).rejects.toThrow(/SSRF/)
    })

    it("throws when fetch itself returns non-OK non-502", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => "boom",
        }) as unknown as typeof fetch
        await expect(sendNativeGrpc({ url: "x", message: new Uint8Array(0) })).rejects.toThrow(/gRPC proxy 500/)
    })
})
