
// Encryption utilities using Web Crypto API

export async function generateSalt(): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return bufferToBase64(salt);
}

export async function generateIV(): Promise<string> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
    return bufferToBase64(iv);
}

export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const salt = base64ToBuffer(saltBase64);

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, // Key is not extractable
        ["encrypt", "decrypt"]
    );
}

export async function encryptData(key: CryptoKey, data: string): Promise<{ encrypted: string; iv: string }> {
    const enc = new TextEncoder();
    const encodedData = enc.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as any,
        },
        key,
        encodedData
    );

    return {
        encrypted: bufferToBase64(new Uint8Array(encryptedBuffer)),
        iv: bufferToBase64(iv),
    };
}

export async function decryptData(key: CryptoKey, encryptedBase64: string, ivBase64: string): Promise<string> {
    const encryptedData = base64ToBuffer(encryptedBase64);
    const iv = base64ToBuffer(ivBase64);

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv as any,
            },
            key,
            encryptedData as any
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (e) {
        throw new Error("Decryption failed. Wrong key or corrupted data.");
    }
}

// Helper functions for Base64 conversion
function bufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function createKeyVerifier(key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    return encryptData(key, "VERIFICATION_TOKEN");
}

export async function verifyKey(key: CryptoKey, encrypted: string, iv: string): Promise<boolean> {
    try {
        const decrypted = await decryptData(key, encrypted, iv);
        return decrypted === "VERIFICATION_TOKEN";
    } catch {
        return false;
    }
}

// ── Backup codes ──────────────────────────────────────────────────────────────

const BACKUP_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/**
 * M-9 fix: uniform random character selection using rejection sampling.
 * Avoids modulo bias that would make some characters ~12% more likely.
 */
function uniformRandomChar(charset: string): string {
    const maxValid = 256 - (256 % charset.length) // Largest multiple of charset.length that fits in a byte
    let byte: number
    do {
        byte = window.crypto.getRandomValues(new Uint8Array(1))[0]!
    } while (byte >= maxValid)
    return charset[byte % charset.length]!
}

export function generateBackupCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
        const chars = Array.from({ length: 18 }, () => uniformRandomChar(BACKUP_CODE_CHARSET))
        return `${chars.slice(0, 6).join("")}-${chars.slice(6, 12).join("")}-${chars.slice(12, 18).join("")}`
    })
}

export async function encryptWithBackupCode(
    code: string,
    masterPassword: string,
): Promise<{ codeId: string; codeSalt: string; encrypted: string; iv: string }> {
    const normalized = code.replace(/-/g, "")
    // H-7 fix: use first 10 chars for codeId (30^10 ≈ 590T possibilities)
    // instead of 6 chars (30^6 ≈ 729M) to prevent brute-force enumeration.
    const codeId = normalized.slice(0, 10)
    const codeSalt = await generateSalt()
    const key = await deriveKey(normalized, codeSalt)
    const { encrypted, iv } = await encryptData(key, masterPassword)
    return { codeId, codeSalt, encrypted, iv }
}

export async function decryptWithBackupCode(
    code: string,
    codeSalt: string,
    encrypted: string,
    iv: string,
): Promise<string> {
    const normalized = code.replace(/-/g, "")
    const key = await deriveKey(normalized, codeSalt)
    return decryptData(key, encrypted, iv)
}
