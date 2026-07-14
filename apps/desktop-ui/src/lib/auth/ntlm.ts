/**
 * NTLMv2 message builder.
 *
 * Three messages:
 *   - Type1 NEGOTIATE — client opens the handshake.
 *   - Type2 CHALLENGE — server response carrying the 8-byte challenge + TargetInfo.
 *   - Type3 AUTHENTICATE — client computes NTLMv2 response and ships it back.
 *
 * Spec: [MS-NLMP] §2.2. Implemented for the common case: no LM response,
 * no signing/sealing, no key exchange — enough for HTTP-NTLM against
 * IIS / SharePoint / Exchange.
 */

import { md4 } from "./md4"
import { hmacMd5 } from "./md5-bytes"

const SIGNATURE = new Uint8Array([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00])  // "NTLMSSP\0"

const NEGOTIATE_UNICODE = 0x00000001
const NEGOTIATE_OEM = 0x00000002
const REQUEST_TARGET = 0x00000004
const NEGOTIATE_NTLM = 0x00000200
const NEGOTIATE_DOMAIN_SUPPLIED = 0x00001000
const NEGOTIATE_WORKSTATION_SUPPLIED = 0x00002000
const NEGOTIATE_ALWAYS_SIGN = 0x00008000
const NEGOTIATE_NTLMV2 = 0x00080000
const NEGOTIATE_TARGET_INFO = 0x00800000
const NEGOTIATE_VERSION = 0x02000000
const NEGOTIATE_128 = 0x20000000
const NEGOTIATE_56 = 0x80000000

const T1_FLAGS =
    NEGOTIATE_UNICODE |
    NEGOTIATE_OEM |
    REQUEST_TARGET |
    NEGOTIATE_NTLM |
    NEGOTIATE_ALWAYS_SIGN |
    NEGOTIATE_NTLMV2 |
    NEGOTIATE_TARGET_INFO |
    NEGOTIATE_128 |
    NEGOTIATE_56

const T3_FLAGS = T1_FLAGS

function utf16le(s: string): Uint8Array {
    const out = new Uint8Array(s.length * 2)
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i)
        out[i * 2] = c & 0xff
        out[i * 2 + 1] = (c >>> 8) & 0xff
    }
    return out
}

function ascii(s: string): Uint8Array {
    const out = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
    return out
}

function concat(...chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((s, c) => s + c.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) { out.set(c, off); off += c.length }
    return out
}

function toBase64(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
}

function fromBase64(s: string): Uint8Array {
    const bin = atob(s)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

function writeU32LE(buf: Uint8Array, off: number, v: number): void {
    buf[off] = v & 0xff
    buf[off + 1] = (v >>> 8) & 0xff
    buf[off + 2] = (v >>> 16) & 0xff
    buf[off + 3] = (v >>> 24) & 0xff
}

function writeU16LE(buf: Uint8Array, off: number, v: number): void {
    buf[off] = v & 0xff
    buf[off + 1] = (v >>> 8) & 0xff
}

function readU32LE(buf: Uint8Array, off: number): number {
    return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)
}

function readU16LE(buf: Uint8Array, off: number): number {
    return buf[off] | (buf[off + 1] << 8)
}

/** Build a Type1 NEGOTIATE message. Domain + workstation are usually empty. */
export function createType1Message(domain = "", workstation = ""): string {
    const domainBytes = ascii(domain.toUpperCase())
    const wsBytes = ascii(workstation.toUpperCase())

    // OS version (8 bytes): pretend Win 10.0.10240.
    const osVersion = new Uint8Array([0x0a, 0x00, 0x9b, 0x28, 0x00, 0x00, 0x00, 0x0f])

    let flags = T1_FLAGS
    if (domainBytes.length > 0) flags |= NEGOTIATE_DOMAIN_SUPPLIED
    if (wsBytes.length > 0) flags |= NEGOTIATE_WORKSTATION_SUPPLIED
    if (osVersion.length > 0) flags |= NEGOTIATE_VERSION

    const headerLen = 8 + 4 + 4 + 8 + 8 + 8  // signature + type + flags + 2 SecurityBuffers + OS version
    const payloadOffset = headerLen
    const wsOffset = payloadOffset
    const domainOffset = wsOffset + wsBytes.length

    const buf = new Uint8Array(headerLen + wsBytes.length + domainBytes.length)
    buf.set(SIGNATURE, 0)
    writeU32LE(buf, 8, 0x01)  // Type1
    writeU32LE(buf, 12, flags)
    // Domain SecurityBuffer (length, max length, offset)
    writeU16LE(buf, 16, domainBytes.length)
    writeU16LE(buf, 18, domainBytes.length)
    writeU32LE(buf, 20, domainOffset)
    // Workstation SecurityBuffer
    writeU16LE(buf, 24, wsBytes.length)
    writeU16LE(buf, 26, wsBytes.length)
    writeU32LE(buf, 28, wsOffset)
    // OS version
    buf.set(osVersion, 32)
    // Payloads
    buf.set(wsBytes, wsOffset)
    buf.set(domainBytes, domainOffset)

    return toBase64(buf)
}

export interface Type2 {
    serverChallenge: Uint8Array  // 8 bytes
    targetInfo: Uint8Array
    flags: number
}

export function parseType2Message(b64: string): Type2 {
    const buf = fromBase64(b64)
    if (buf.length < 48) throw new Error("Type2 message too short")
    // Verify signature.
    for (let i = 0; i < 8; i++) {
        if (buf[i] !== SIGNATURE[i]) throw new Error("Type2: bad NTLMSSP signature")
    }
    if (readU32LE(buf, 8) !== 0x02) throw new Error("Type2: wrong message type")
    const flags = readU32LE(buf, 20)
    const serverChallenge = buf.slice(24, 32)
    // TargetInfo SecurityBuffer at offset 40.
    const tiLen = readU16LE(buf, 40)
    const tiOffset = readU32LE(buf, 44)
    const targetInfo = tiLen > 0 && tiOffset + tiLen <= buf.length
        ? buf.slice(tiOffset, tiOffset + tiLen)
        : new Uint8Array(0)
    return { serverChallenge, targetInfo, flags }
}

/**
 * Compute the NTLMv2 Authenticate (Type3) message.
 * `timestamp` and `clientChallenge` are injectable for tests; production-side
 * the helper fills them with current time + 8 random bytes.
 */
export function createType3Message(args: {
    type2: Type2
    username: string
    password: string
    domain?: string
    workstation?: string
    timestamp?: bigint
    clientChallenge?: Uint8Array
}): string {
    const domain = args.domain ?? ""
    const workstation = args.workstation ?? "WORKSTATION"
    const username = args.username

    // NT hash = MD4(UTF-16LE password)
    const ntHash = md4(utf16le(args.password))
    // NTLMv2 hash = HMAC-MD5(NT hash, UTF-16LE(uppercase(username) + domain))
    const ntlmv2Hash = hmacMd5(ntHash, utf16le(username.toUpperCase() + domain))

    const clientChallenge = args.clientChallenge ?? (() => {
        const b = new Uint8Array(8)
        crypto.getRandomValues(b)
        return b
    })()

    // Windows file time: 100-ns intervals since 1601-01-01.
    const epochDiff = BigInt("11644473600000")
    const ts = args.timestamp ?? (BigInt(Date.now()) + epochDiff) * BigInt(10000)
    const tsBytes = new Uint8Array(8)
    const mask = BigInt(0xff)
    for (let i = 0; i < 8; i++) tsBytes[i] = Number((ts >> BigInt(i * 8)) & mask)

    // Blob (NTLMv2 ClientChallenge structure):
    // 0x01 0x01 0x00 0x00 0x00 0x00 0x00 0x00 + timestamp(8) + clientChallenge(8) + 0x00 0x00 0x00 0x00 + targetInfo + 0x00 0x00 0x00 0x00
    const blob = concat(
        new Uint8Array([0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        tsBytes,
        clientChallenge,
        new Uint8Array([0x00, 0x00, 0x00, 0x00]),
        args.type2.targetInfo,
        new Uint8Array([0x00, 0x00, 0x00, 0x00]),
    )

    // NTLMv2 response = HMAC-MD5(NTLMv2 hash, serverChallenge + blob) || blob
    const ntProofStr = hmacMd5(ntlmv2Hash, concat(args.type2.serverChallenge, blob))
    const ntResponse = concat(ntProofStr, blob)

    // LM response — for NTLMv2-only we zero it (or send 24 zero bytes per [MS-NLMP] §3.3.2).
    const lmResponse = new Uint8Array(24)

    const userBytes = utf16le(username)
    const domainBytes = utf16le(domain)
    const wsBytes = utf16le(workstation)
    const sessionKey = new Uint8Array(0)  // not used without sealing

    const headerLen = 8 + 4 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 8  // 72
    const lmOffset = headerLen
    const ntOffset = lmOffset + lmResponse.length
    const domainOffset = ntOffset + ntResponse.length
    const userOffset = domainOffset + domainBytes.length
    const wsOffset = userOffset + userBytes.length
    const sessionOffset = wsOffset + wsBytes.length
    const totalLen = sessionOffset + sessionKey.length

    const buf = new Uint8Array(totalLen)
    buf.set(SIGNATURE, 0)
    writeU32LE(buf, 8, 0x03)  // Type3

    // LM response buffer
    writeU16LE(buf, 12, lmResponse.length); writeU16LE(buf, 14, lmResponse.length); writeU32LE(buf, 16, lmOffset)
    // NT response buffer
    writeU16LE(buf, 20, ntResponse.length); writeU16LE(buf, 22, ntResponse.length); writeU32LE(buf, 24, ntOffset)
    // Domain buffer
    writeU16LE(buf, 28, domainBytes.length); writeU16LE(buf, 30, domainBytes.length); writeU32LE(buf, 32, domainOffset)
    // User buffer
    writeU16LE(buf, 36, userBytes.length); writeU16LE(buf, 38, userBytes.length); writeU32LE(buf, 40, userOffset)
    // Workstation buffer
    writeU16LE(buf, 44, wsBytes.length); writeU16LE(buf, 46, wsBytes.length); writeU32LE(buf, 48, wsOffset)
    // SessionKey buffer
    writeU16LE(buf, 52, sessionKey.length); writeU16LE(buf, 54, sessionKey.length); writeU32LE(buf, 56, sessionOffset)
    // Flags
    writeU32LE(buf, 60, T3_FLAGS | NEGOTIATE_VERSION)
    // OS version
    buf.set(new Uint8Array([0x0a, 0x00, 0x9b, 0x28, 0x00, 0x00, 0x00, 0x0f]), 64)

    // Payloads
    buf.set(lmResponse, lmOffset)
    buf.set(ntResponse, ntOffset)
    buf.set(domainBytes, domainOffset)
    buf.set(userBytes, userOffset)
    buf.set(wsBytes, wsOffset)
    buf.set(sessionKey, sessionOffset)

    return toBase64(buf)
}
