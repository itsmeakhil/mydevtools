import { pullSseEvents } from "../sse-client"

describe("pullSseEvents", () => {
    it("parses a single complete event terminated by blank line", () => {
        const { events, remaining } = pullSseEvents("data: hello\n\n")
        expect(events).toHaveLength(1)
        expect(events[0].data).toBe("hello")
        expect(remaining).toBe("")
    })

    it("strips the optional single leading space after colon", () => {
        const { events } = pullSseEvents("data: hello\n\ndata:no-space\n\n")
        expect(events[0].data).toBe("hello")
        expect(events[1].data).toBe("no-space")
    })

    it("joins multi-line data with newlines", () => {
        const { events } = pullSseEvents("data: line1\ndata: line2\n\n")
        expect(events[0].data).toBe("line1\nline2")
    })

    it("captures event, id, retry fields", () => {
        const raw = "event: ping\nid: 42\nretry: 5000\ndata: hi\n\n"
        const { events } = pullSseEvents(raw)
        expect(events[0]).toMatchObject({
            event: "ping", id: "42", retry: 5000, data: "hi",
        })
    })

    it("returns trailing partial event in `remaining`", () => {
        const { events, remaining } = pullSseEvents("data: complete\n\ndata: partial")
        expect(events).toHaveLength(1)
        expect(remaining).toBe("data: partial")
    })

    it("ignores comment lines", () => {
        const { events } = pullSseEvents(":heartbeat\n:keepalive\ndata: real\n\n")
        expect(events).toHaveLength(1)
        expect(events[0].data).toBe("real")
    })

    it("handles CRLF event separators", () => {
        const { events } = pullSseEvents("data: a\r\n\r\ndata: b\r\n\r\n")
        expect(events.map((e) => e.data)).toEqual(["a", "b"])
    })

    it("skips events with no fields at all", () => {
        // Bare blank line in the middle of nowhere — no payload, no field => skipped.
        const { events } = pullSseEvents("\n\n")
        expect(events).toEqual([])
    })
})
