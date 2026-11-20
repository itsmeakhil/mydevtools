import { pullSseEvents, wantsEventStream } from "../sse"
import { isNdjsonContentType, parseNdjson } from "../ndjson"
import { isSubscriptionOperation, toWebSocketUrl } from "../graphql-operation"

describe("pullSseEvents", () => {
    it("parses complete events and keeps the unterminated tail", () => {
        const { events, remaining } = pullSseEvents("data: a\n\nevent: ping\nid: 7\ndata: x\ndata:y\n\ndata: part", 1)
        expect(events).toEqual([
            { data: "a", timestamp: 1 },
            { event: "ping", id: "7", data: "x\ny", timestamp: 1 },
        ])
        expect(remaining).toBe("data: part")
    })

    it("skips comments and field-less blocks, handles CRLF", () => {
        const { events } = pullSseEvents(":keepalive\n\n\n\ndata: a\r\n\r\ndata: b\r\n\r\n")
        expect(events.map((e) => e.data)).toEqual(["a", "b"])
    })

    it("reassembles an event split across chunks", () => {
        const first = pullSseEvents("data: hel")
        const second = pullSseEvents(first.remaining + "lo\n\n")
        expect(first.events).toEqual([])
        expect(second.events.map((e) => e.data)).toEqual(["hello"])
    })

    it("detects Accept: text/event-stream case-insensitively", () => {
        expect(wantsEventStream({ ACCEPT: "Text/Event-Stream" })).toBe(true)
        expect(wantsEventStream({ Accept: "application/json" })).toBe(false)
    })
})

describe("parseNdjson", () => {
    it("parses each line, reports bad lines, skips blanks", () => {
        const { lines, truncated } = parseNdjson('{"a":1}\n\nnope\r\n[2]\n')
        expect(truncated).toBe(false)
        expect(lines.map((l) => [l.line, l.value, !!l.error])).toEqual([[1, { a: 1 }, false], [3, undefined, true], [4, [2], false]])
    })

    it("caps the number of lines", () => {
        expect(parseNdjson("1\n2\n3", 2)).toMatchObject({ truncated: true, lines: [{ value: 1 }, { value: 2 }] })
    })

    it("recognises the content types", () => {
        for (const ct of ["application/x-ndjson", "application/jsonl", "application/json-lines"]) expect(isNdjsonContentType(ct)).toBe(true)
        expect(isNdjsonContentType("application/json")).toBe(false)
    })
})

describe("isSubscriptionOperation", () => {
    it.each([
        ["subscription { tick }", true],
        ["# comment\n  subscription OnTick($n: Int) { tick(n: $n) }", true],
        ["fragment F on T { subscription }\nsubscription S { t { ...F } }", true],
        ["query { subscription }", false],
        ["{ subscription }", false],
        ['mutation { a(s: "subscription") }', false],
        ["", false],
    ])("%j → %s", (q, want) => {
        expect(isSubscriptionOperation(q)).toBe(want)
    })

    it("maps http(s) to ws(s)", () => {
        expect(toWebSocketUrl("https://x.dev/graphql")).toBe("wss://x.dev/graphql")
        expect(toWebSocketUrl("http://x")).toBe("ws://x")
        expect(toWebSocketUrl("ws://x")).toBe("ws://x")
    })
})
