/**
 * Read-side decoders for string values.
 * No new deps — Plain / JSON / Hex / Base64 only.
 * ponytail: MsgPack / Gzip / Brotli / Protobuf require libs; skipped until demanded.
 */

export type DecoderKind = "plain" | "json" | "hex" | "base64";

export const DECODER_LABELS: Record<DecoderKind, string> = {
    plain: "Plain",
    json: "JSON",
    hex: "Hex",
    base64: "Base64",
};

export interface DecodeResult {
    text: string;
    error?: string;
}

export function decode(raw: string, kind: DecoderKind): DecodeResult {
    if (kind === "plain") return { text: raw };
    if (kind === "json") {
        try {
            return { text: JSON.stringify(JSON.parse(raw), null, 2) };
        } catch (e) {
            return { text: raw, error: e instanceof Error ? e.message : "Invalid JSON" };
        }
    }
    if (kind === "hex") {
        try {
            const bytes = new TextEncoder().encode(raw);
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
            return { text: hex };
        } catch (e) {
            return { text: raw, error: e instanceof Error ? e.message : "Hex encode failed" };
        }
    }
    if (kind === "base64") {
        try {
            // Try decode first; if input is base64 → show plain. Else show base64-encoded form.
            const looksB64 = /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s/g, "").length % 4 === 0;
            if (looksB64) {
                const decoded = atob(raw.replace(/\s/g, ""));
                return { text: decoded };
            }
            return { text: btoa(unescape(encodeURIComponent(raw))) };
        } catch (e) {
            return { text: raw, error: e instanceof Error ? e.message : "Base64 failed" };
        }
    }
    return { text: raw };
}
