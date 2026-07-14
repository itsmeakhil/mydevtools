/**
 * RFC 1320 MD4 — required by NTLM (NT hash = MD4(UTF-16LE password)).
 * Compact bytewise implementation; only used inside the NTLM signer.
 */

function add32(a: number, b: number): number {
    return (a + b) & 0xffffffff
}

function rotl(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) & 0xffffffff
}

function F(x: number, y: number, z: number): number { return (x & y) | (~x & z) }
function G(x: number, y: number, z: number): number { return (x & y) | (x & z) | (y & z) }
function H(x: number, y: number, z: number): number { return x ^ y ^ z }

export function md4(bytes: Uint8Array): Uint8Array {
    const lenBits = bytes.length * 8
    // Padding: append 0x80, then zeros, then 8-byte LE length.
    const padded = new Uint8Array(((bytes.length + 9 + 63) & ~63))
    padded.set(bytes)
    padded[bytes.length] = 0x80
    // Length goes in the last 8 bytes (LE).
    for (let i = 0; i < 8; i++) {
        padded[padded.length - 8 + i] = (lenBits / Math.pow(2, 8 * i)) & 0xff
    }

    let a = 0x67452301
    let b = 0xefcdab89
    let c = 0x98badcfe
    let d = 0x10325476

    const x = new Int32Array(16)
    for (let blkStart = 0; blkStart < padded.length; blkStart += 64) {
        for (let i = 0; i < 16; i++) {
            x[i] = padded[blkStart + i * 4]
                | (padded[blkStart + i * 4 + 1] << 8)
                | (padded[blkStart + i * 4 + 2] << 16)
                | (padded[blkStart + i * 4 + 3] << 24)
        }
        const aa = a, bb = b, cc = c, dd = d

        // Round 1: F
        const r1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        const s1 = [3, 7, 11, 19]
        for (let i = 0; i < 16; i++) {
            const k = r1[i]
            const ss = s1[i % 4]
            if (i % 4 === 0) a = rotl(add32(a, add32(F(b, c, d), x[k])), ss)
            else if (i % 4 === 1) d = rotl(add32(d, add32(F(a, b, c), x[k])), ss)
            else if (i % 4 === 2) c = rotl(add32(c, add32(F(d, a, b), x[k])), ss)
            else b = rotl(add32(b, add32(F(c, d, a), x[k])), ss)
        }

        // Round 2: G
        const r2 = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15]
        const s2 = [3, 5, 9, 13]
        for (let i = 0; i < 16; i++) {
            const k = r2[i]
            const ss = s2[i % 4]
            if (i % 4 === 0) a = rotl(add32(a, add32(add32(G(b, c, d), x[k]), 0x5a827999)), ss)
            else if (i % 4 === 1) d = rotl(add32(d, add32(add32(G(a, b, c), x[k]), 0x5a827999)), ss)
            else if (i % 4 === 2) c = rotl(add32(c, add32(add32(G(d, a, b), x[k]), 0x5a827999)), ss)
            else b = rotl(add32(b, add32(add32(G(c, d, a), x[k]), 0x5a827999)), ss)
        }

        // Round 3: H
        const r3 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
        const s3 = [3, 9, 11, 15]
        for (let i = 0; i < 16; i++) {
            const k = r3[i]
            const ss = s3[i % 4]
            if (i % 4 === 0) a = rotl(add32(a, add32(add32(H(b, c, d), x[k]), 0x6ed9eba1)), ss)
            else if (i % 4 === 1) d = rotl(add32(d, add32(add32(H(a, b, c), x[k]), 0x6ed9eba1)), ss)
            else if (i % 4 === 2) c = rotl(add32(c, add32(add32(H(d, a, b), x[k]), 0x6ed9eba1)), ss)
            else b = rotl(add32(b, add32(add32(H(c, d, a), x[k]), 0x6ed9eba1)), ss)
        }

        a = add32(a, aa)
        b = add32(b, bb)
        c = add32(c, cc)
        d = add32(d, dd)
    }

    const out = new Uint8Array(16)
    for (let i = 0, j = 0; i < 4; i++) {
        const v = [a, b, c, d][i]
        out[j++] = v & 0xff
        out[j++] = (v >>> 8) & 0xff
        out[j++] = (v >>> 16) & 0xff
        out[j++] = (v >>> 24) & 0xff
    }
    return out
}
