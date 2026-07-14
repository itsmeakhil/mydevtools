import {
    encodeMessageFrame,
    readFrames,
    parseTrailers,
    bytesToBase64,
    base64ToBytes,
} from "../grpc-web"

describe("grpc-web frame format", () => {
    it("prepends a 5-byte header with big-endian length", () => {
        const msg = new Uint8Array([0x11, 0x22, 0x33])
        const frame = encodeMessageFrame(msg)
        expect(Array.from(frame.slice(0, 5))).toEqual([0x00, 0x00, 0x00, 0x00, 0x03])
        expect(Array.from(frame.slice(5))).toEqual([0x11, 0x22, 0x33])
    })

    it("reads back encoded frames", () => {
        const a = encodeMessageFrame(new Uint8Array([1, 2, 3]))
        const b = encodeMessageFrame(new Uint8Array([4, 5]))
        const stream = new Uint8Array([...a, ...b])
        const { frames, remaining } = readFrames(stream)
        expect(frames).toHaveLength(2)
        expect(frames[0].payload).toEqual(new Uint8Array([1, 2, 3]))
        expect(frames[1].payload).toEqual(new Uint8Array([4, 5]))
        expect(remaining.length).toBe(0)
    })

    it("flags the trailer frame", () => {
        const trailer = new Uint8Array([0x80, 0, 0, 0, 4, 0x61, 0x62, 0x63, 0x64])  // 0x80 = trailer flag, len 4, "abcd"
        const { frames } = readFrames(trailer)
        expect(frames).toHaveLength(1)
        expect(frames[0].isTrailer).toBe(true)
    })

    it("preserves remaining bytes when last frame is incomplete", () => {
        const partial = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x05, 0xaa])
        const { frames, remaining } = readFrames(partial)
        expect(frames).toHaveLength(0)
        expect(remaining.length).toBe(6)
    })

    it("parses Grpc-Status + Grpc-Message trailer lines", () => {
        const payload = new TextEncoder().encode("Grpc-Status: 0\r\nGrpc-Message: ok\r\n")
        const map = parseTrailers(payload)
        expect(map["grpc-status"]).toBe("0")
        expect(map["grpc-message"]).toBe("ok")
    })

    it("base64 round-trips raw bytes", () => {
        const bytes = new Uint8Array([0x00, 0xff, 0xab, 0x10])
        const b64 = bytesToBase64(bytes)
        expect(base64ToBytes(b64)).toEqual(bytes)
    })
})
