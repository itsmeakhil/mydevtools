/**
 * Thin protobufjs wrapper. Parses a `.proto` document, surfaces the discovered
 * services + methods, and round-trips JSON ↔ binary for chosen request/response
 * messages.
 */

import * as protobuf from "protobufjs"

export interface ProtoMethodEntry {
    serviceName: string
    /** Service path as `package.service/Method` — used directly as the gRPC URL suffix. */
    path: string
    methodName: string
    requestTypeName: string
    responseTypeName: string
    clientStreaming?: boolean
    serverStreaming?: boolean
}

export interface ParsedProto {
    root: protobuf.Root
    services: { name: string; methods: ProtoMethodEntry[] }[]
}

export function parseProto(source: string): ParsedProto {
    const root = protobuf.parse(source, { keepCase: true }).root
    root.resolveAll()

    const services: ParsedProto["services"] = []
    walk(root, services)
    return { root, services }
}

function walk(ns: protobuf.NamespaceBase, services: ParsedProto["services"]): void {
    for (const child of ns.nestedArray ?? []) {
        if (child instanceof protobuf.Service) {
            const methods: ProtoMethodEntry[] = []
            for (const m of child.methodsArray) {
                m.resolve()
                methods.push({
                    serviceName: child.fullName.replace(/^\./, ""),
                    path: `${child.fullName.replace(/^\./, "")}/${m.name}`,
                    methodName: m.name,
                    requestTypeName: (m.resolvedRequestType ?? m.requestType) as string,
                    responseTypeName: (m.resolvedResponseType ?? m.responseType) as string,
                    clientStreaming: m.requestStream,
                    serverStreaming: m.responseStream,
                })
            }
            services.push({ name: child.fullName.replace(/^\./, ""), methods })
        } else if (child instanceof protobuf.Namespace) {
            walk(child, services)
        }
    }
}

/** Resolve a message-type name (qualified or short) to its protobufjs Type. */
function lookupType(root: protobuf.Root, name: string): protobuf.Type {
    const t = root.lookupType(name.replace(/^\./, ""))
    return t
}

export function encodeMessage(root: protobuf.Root, typeName: string, json: unknown): Uint8Array {
    const type = lookupType(root, typeName)
    const errMsg = type.verify(json as Record<string, unknown>)
    if (errMsg) throw new Error(`Verify failed for ${typeName}: ${errMsg}`)
    const message = type.fromObject(json as Record<string, unknown>)
    return type.encode(message).finish()
}

/**
 * Synthesise a JSON skeleton for a message type — every field filled with a
 * default value appropriate to its type. Used to pre-populate the request
 * editor after method selection.
 */
export function skeletonForType(root: protobuf.Root, typeName: string): unknown {
    const type = lookupType(root, typeName)
    return buildSkeleton(type, new Set())
}

function buildSkeleton(type: protobuf.Type, visiting: Set<string>): unknown {
    if (visiting.has(type.fullName)) return null  // cycle guard for self-referential types
    visiting.add(type.fullName)
    const out: Record<string, unknown> = {}
    for (const field of type.fieldsArray) {
        field.resolve()
        if (field.repeated) {
            out[field.name] = [scalarSkeleton(field, visiting)]
        } else if (field.map) {
            out[field.name] = {}
        } else {
            out[field.name] = scalarSkeleton(field, visiting)
        }
    }
    visiting.delete(type.fullName)
    return out
}

function scalarSkeleton(field: protobuf.Field, visiting: Set<string>): unknown {
    const t = field.type
    switch (t) {
        case "string": return ""
        case "bool": return false
        case "double": case "float":
        case "int32": case "uint32": case "sint32":
        case "fixed32": case "sfixed32":
            return 0
        case "int64": case "uint64": case "sint64":
        case "fixed64": case "sfixed64":
            return "0"
        case "bytes": return ""
    }
    if (field.resolvedType instanceof protobuf.Enum) {
        const first = Object.keys(field.resolvedType.values)[0]
        return first ?? 0
    }
    if (field.resolvedType instanceof protobuf.Type) {
        return buildSkeleton(field.resolvedType, visiting)
    }
    return null
}

export function decodeMessage(root: protobuf.Root, typeName: string, bytes: Uint8Array): unknown {
    const type = lookupType(root, typeName)
    const decoded = type.decode(bytes)
    return type.toObject(decoded, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
    })
}
