import { parseProto, encodeMessage, decodeMessage } from "../proto-parser"

const SAMPLE = `
syntax = "proto3";
package demo;
message HelloRequest { string name = 1; int32 age = 2; }
message HelloReply { string message = 1; }
service Greeter {
    rpc SayHello (HelloRequest) returns (HelloReply);
    rpc SayHelloStream (HelloRequest) returns (stream HelloReply);
}
`

describe("parseProto", () => {
    it("discovers services + methods", () => {
        const { services } = parseProto(SAMPLE)
        expect(services).toHaveLength(1)
        expect(services[0].name).toBe("demo.Greeter")
        expect(services[0].methods.map((m) => m.methodName)).toEqual(["SayHello", "SayHelloStream"])
    })

    it("emits path strings usable as gRPC URL suffix", () => {
        const { services } = parseProto(SAMPLE)
        expect(services[0].methods[0].path).toBe("demo.Greeter/SayHello")
    })

    it("captures stream flags", () => {
        const { services } = parseProto(SAMPLE)
        const stream = services[0].methods[1]
        expect(stream.serverStreaming).toBe(true)
    })
})

describe("encode / decode round-trip", () => {
    it("preserves field values", () => {
        const { root } = parseProto(SAMPLE)
        const bytes = encodeMessage(root, "demo.HelloRequest", { name: "alice", age: 30 })
        expect(bytes.length).toBeGreaterThan(0)
        const back = decodeMessage(root, "demo.HelloRequest", bytes) as { name: string; age: number }
        expect(back.name).toBe("alice")
        expect(back.age).toBe(30)
    })

    it("rejects bad field types via verify()", () => {
        const { root } = parseProto(SAMPLE)
        expect(() => encodeMessage(root, "demo.HelloRequest", { name: 123 })).toThrow(/Verify failed/)
    })
})
