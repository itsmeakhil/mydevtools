import { decode } from "../value-decoders";

describe("decode", () => {
    it("plain returns input unchanged", () => {
        expect(decode("hello", "plain").text).toBe("hello");
    });

    it("json pretty-prints valid JSON", () => {
        expect(decode('{"a":1}', "json").text).toBe('{\n  "a": 1\n}');
    });

    it("json returns input + error on invalid JSON", () => {
        const r = decode("not json", "json");
        expect(r.error).toBeDefined();
        expect(r.text).toBe("not json");
    });

    it("hex encodes bytes", () => {
        expect(decode("Hi", "hex").text).toBe("48 69");
    });

    it("base64 decodes valid base64", () => {
        expect(decode("aGVsbG8=", "base64").text).toBe("hello");
    });

    it("base64 encodes non-base64 input", () => {
        // 'Hi!' has '!' which isn't valid b64 → fallback to encode
        expect(decode("Hi!", "base64").text).toBe("SGkh");
    });
});
