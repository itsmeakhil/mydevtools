import * as protobuf from "protobufjs"
import { listReflectionServices } from "../grpc-reflection"
import { encodeMessageFrame, bytesToBase64 } from "../grpc-web"

/**
 * The reflection helper goes:
 *   1. encode a ServerReflectionRequest via inline schema
 *   2. send via sendNativeGrpc (which POSTs /api/proxy-grpc)
 *   3. decode the ServerReflectionResponse
 *
 * We mock fetch at the boundary and reply with an encoded
 * ListServiceResponse — same wire format the route would produce.
 */

const REFLECTION_PROTO = `
syntax = "proto3";
package grpc.reflection.v1;
message ServerReflectionRequest {
    string host = 1;
    oneof message_request {
        string list_services = 7;
    }
}
message ServerReflectionResponse {
    string valid_host = 1;
    oneof message_response {
        ListServiceResponse list_services_response = 6;
        ErrorResponse error_response = 7;
    }
}
message ListServiceResponse { repeated ServiceResponse service = 1; }
message ServiceResponse     { string name = 1; }
message ErrorResponse       { int32 error_code = 1; string error_message = 2; }
`

function buildResponse(payload: { list_services_response?: { service: { name: string }[] }; error_response?: { error_code: number; error_message: string } }): Uint8Array {
    const root = protobuf.parse(REFLECTION_PROTO, { keepCase: true }).root
    const type = root.lookupType("grpc.reflection.v1.ServerReflectionResponse")
    return type.encode(type.fromObject(payload)).finish()
}

describe("listReflectionServices", () => {
    const originalFetch = global.fetch
    afterEach(() => { global.fetch = originalFetch })

    it("returns service names, filtering out reflection itself", async () => {
        const respMessage = buildResponse({
            list_services_response: {
                service: [
                    { name: "demo.Greeter" },
                    { name: "demo.Echo" },
                    { name: "grpc.reflection.v1.ServerReflection" },
                ],
            },
        })
        const frame = encodeMessageFrame(respMessage)
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 200,
                body: bytesToBase64(frame),
                headers: {},
                trailers: { "grpc-status": "0" },
                grpcStatus: 0,
            }),
        }) as unknown as typeof fetch

        const services = await listReflectionServices({ serverUrl: "https://grpc.test" })
        expect(services).toEqual(["demo.Greeter", "demo.Echo"])
    })

    it("throws when the server returns an error response", async () => {
        const respMessage = buildResponse({
            error_response: { error_code: 13, error_message: "Reflection disabled" },
        })
        const frame = encodeMessageFrame(respMessage)
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 200,
                body: bytesToBase64(frame),
                headers: {},
                trailers: { "grpc-status": "0" },
                grpcStatus: 0,
            }),
        }) as unknown as typeof fetch

        await expect(listReflectionServices({ serverUrl: "https://grpc.test" }))
            .rejects.toThrow(/Reflection disabled/)
    })

    it("propagates non-zero grpc-status", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 200,
                body: "",
                headers: {},
                trailers: { "grpc-status": "12" },
                grpcStatus: 12,
                grpcMessage: "Unimplemented",
            }),
        }) as unknown as typeof fetch

        await expect(listReflectionServices({ serverUrl: "https://grpc.test" }))
            .rejects.toThrow(/Reflection 12/)
    })
})
