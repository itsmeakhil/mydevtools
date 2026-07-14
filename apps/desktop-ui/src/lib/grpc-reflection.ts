/**
 * gRPC server-reflection client.
 *
 * Reflection is itself a bidi-streaming RPC at
 * `grpc.reflection.v1.ServerReflection/ServerReflectionInfo`. For the common
 * single-request / single-response cases (list services, file_containing_symbol)
 * we send one request frame and read the first response — matches what
 * `grpcurl -reflection` does for one-shot discovery.
 *
 * The reflection .proto schema is inlined so this helper has no extra fetch /
 * resource lookup overhead.
 */

import * as protobuf from "protobufjs"
import { sendNativeGrpc } from "./grpc-web"
import type { ParsedProto, ProtoMethodEntry } from "./proto-parser"

const REFLECTION_PROTO = `
syntax = "proto3";
package grpc.reflection.v1;

service ServerReflection {
    rpc ServerReflectionInfo(stream ServerReflectionRequest) returns (stream ServerReflectionResponse);
}

message ServerReflectionRequest {
    string host = 1;
    oneof message_request {
        string file_by_filename = 3;
        string file_containing_symbol = 4;
        string list_services = 7;
    }
}

message ServerReflectionResponse {
    string valid_host = 1;
    ServerReflectionRequest original_request = 2;
    oneof message_response {
        FileDescriptorResponse file_descriptor_response = 4;
        ListServiceResponse list_services_response = 6;
        ErrorResponse error_response = 7;
    }
}

message FileDescriptorResponse { repeated bytes file_descriptor_proto = 1; }
message ListServiceResponse    { repeated ServiceResponse service = 1; }
message ServiceResponse        { string name = 1; }
message ErrorResponse          { int32 error_code = 1; string error_message = 2; }
`.trim()

let cachedRoot: protobuf.Root | null = null
function reflectionRoot(): protobuf.Root {
    if (cachedRoot) return cachedRoot
    // `keepCase: true` so the decoded object uses the snake_case keys the rest
    // of this file reads (`list_services_response`, `file_descriptor_response`, …).
    cachedRoot = protobuf.parse(REFLECTION_PROTO, { keepCase: true }).root
    cachedRoot.resolveAll()
    return cachedRoot
}

const REFLECTION_METHOD_PATH = "grpc.reflection.v1.ServerReflection/ServerReflectionInfo"

function reflectionRequestBytes(payload: Record<string, unknown>): Uint8Array {
    const root = reflectionRoot()
    const type = root.lookupType("grpc.reflection.v1.ServerReflectionRequest")
    const errMsg = type.verify(payload)
    if (errMsg) throw new Error(errMsg)
    return type.encode(type.fromObject(payload)).finish()
}

function decodeReflectionResponse(bytes: Uint8Array): Record<string, unknown> {
    const root = reflectionRoot()
    const type = root.lookupType("grpc.reflection.v1.ServerReflectionResponse")
    return type.toObject(type.decode(bytes), { defaults: true, enums: String, longs: String, bytes: Uint8Array })
}

async function callReflection(args: {
    serverUrl: string
    request: Record<string, unknown>
    extraHeaders?: Record<string, string>
}): Promise<Record<string, unknown>> {
    const targetUrl = `${args.serverUrl.replace(/\/$/, "")}/${REFLECTION_METHOD_PATH}`
    const messageBytes = reflectionRequestBytes(args.request)
    const result = await sendNativeGrpc({
        url: targetUrl,
        message: messageBytes,
        extraHeaders: args.extraHeaders,
    })
    if (result.grpcStatus !== undefined && result.grpcStatus !== 0) {
        throw new Error(`Reflection ${result.grpcStatus}: ${result.grpcMessage ?? "unknown"}`)
    }
    if (result.messages.length === 0) throw new Error("Reflection returned no messages")
    return decodeReflectionResponse(result.messages[0])
}

interface ReflectionShape {
    list_services_response?: { service?: { name?: string }[] }
    file_descriptor_response?: { file_descriptor_proto?: Uint8Array[] }
    error_response?: { error_code?: number; error_message?: string }
}

export async function listReflectionServices(args: {
    serverUrl: string
    extraHeaders?: Record<string, string>
}): Promise<string[]> {
    const resp = await callReflection({
        serverUrl: args.serverUrl,
        request: { list_services: "" },
        extraHeaders: args.extraHeaders,
    }) as ReflectionShape
    if (resp.error_response) {
        throw new Error(`Reflection error ${resp.error_response.error_code}: ${resp.error_response.error_message}`)
    }
    return (resp.list_services_response?.service ?? [])
        .map((s) => s.name ?? "")
        .filter((n) => n && !n.startsWith("grpc.reflection."))
}

async function fetchFileDescriptors(args: {
    serverUrl: string
    symbol: string
    extraHeaders?: Record<string, string>
}): Promise<Uint8Array[]> {
    const resp = await callReflection({
        serverUrl: args.serverUrl,
        request: { file_containing_symbol: args.symbol },
        extraHeaders: args.extraHeaders,
    }) as ReflectionShape
    if (resp.error_response) {
        throw new Error(`Reflection error ${resp.error_response.error_code}: ${resp.error_response.error_message}`)
    }
    return resp.file_descriptor_response?.file_descriptor_proto ?? []
}

/**
 * Discover every service via reflection, fetch their FileDescriptorProtos,
 * and return a parsed root the rest of the gRPC panel can use as if the user
 * had pasted the .proto manually.
 */
export async function loadReflectedSchema(args: {
    serverUrl: string
    extraHeaders?: Record<string, string>
}): Promise<ParsedProto> {
    const serviceNames = await listReflectionServices(args)
    if (serviceNames.length === 0) {
        throw new Error("Reflection reported no services. Is reflection actually enabled?")
    }

    // Collect every FileDescriptorProto across all services; dedupe by reference bytes.
    const seen = new Set<string>()
    const fileBytes: Uint8Array[] = []
    for (const svc of serviceNames) {
        const fds = await fetchFileDescriptors({
            serverUrl: args.serverUrl,
            symbol: svc,
            extraHeaders: args.extraHeaders,
        })
        for (const fd of fds) {
            // Use byte length + first 32 bytes as a cheap dedupe key.
            const key = `${fd.length}:${Array.from(fd.slice(0, 32)).join(",")}`
            if (seen.has(key)) continue
            seen.add(key)
            fileBytes.push(fd)
        }
    }

    // Build a FileDescriptorSet → bytes → Root via protobufjs.
    const descriptorRoot = (protobuf as unknown as { descriptor?: protobuf.Root }).descriptor
    if (!descriptorRoot) {
        throw new Error("protobufjs descriptor module unavailable in this build")
    }
    const FileDescriptorSet = descriptorRoot.lookupType("google.protobuf.FileDescriptorSet")
    const FileDescriptorProto = descriptorRoot.lookupType("google.protobuf.FileDescriptorProto")

    const decodedFiles = fileBytes.map((b) => FileDescriptorProto.decode(b))
    const setBytes = FileDescriptorSet.encode(
        FileDescriptorSet.fromObject({ file: decodedFiles.map((f) => FileDescriptorProto.toObject(f)) }),
    ).finish()

    // `Root.fromDescriptor` lives in protobufjs runtime but is missing from the
    // type surface — narrow cast keeps strict-mode happy.
    type RootCtorWithDescriptor = typeof protobuf.Root & {
        fromDescriptor: (buf: Uint8Array) => protobuf.Root
    }
    const RootCtor = protobuf.Root as RootCtorWithDescriptor
    if (typeof RootCtor.fromDescriptor !== "function") {
        throw new Error("protobufjs Root.fromDescriptor missing — descriptor module not loaded")
    }
    const root = RootCtor.fromDescriptor(setBytes)
    root.resolveAll()

    const services: ParsedProto["services"] = []
    walkServices(root, services, serviceNames)
    return { root, services }
}

function walkServices(
    ns: protobuf.NamespaceBase,
    services: ParsedProto["services"],
    keepNames: string[],
): void {
    const keepSet = new Set(keepNames)
    for (const child of ns.nestedArray ?? []) {
        if (child instanceof protobuf.Service) {
            const fullName = child.fullName.replace(/^\./, "")
            if (!keepSet.has(fullName)) continue
            const methods: ProtoMethodEntry[] = []
            for (const m of child.methodsArray) {
                m.resolve()
                methods.push({
                    serviceName: fullName,
                    path: `${fullName}/${m.name}`,
                    methodName: m.name,
                    requestTypeName: (m.resolvedRequestType ?? m.requestType) as string,
                    responseTypeName: (m.resolvedResponseType ?? m.responseType) as string,
                    clientStreaming: m.requestStream,
                    serverStreaming: m.responseStream,
                })
            }
            services.push({ name: fullName, methods })
        } else if (child instanceof protobuf.Namespace) {
            walkServices(child, services, keepNames)
        }
    }
}
