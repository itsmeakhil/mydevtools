// results-table.tsx uses next-intl, whose build ships as ESM and cannot be
// parsed under this node-environment jest config. This suite never renders.
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

import { formatBinary } from "../sql/results-table";

describe("formatBinary", () => {
    it("summarises a blob as hex plus its true length", () => {
        expect(formatBinary({ $binary: "ff0041", length: 3 })).toBe("0xff0041 (3 B)");
    });

    it("reports the real length, not the length of the hex preview", () => {
        // Rust caps the hex at 1 KB of source bytes; the size shown must still
        // be the size on the server, or a 2 MB blob reads as a 1 KB one.
        const hex = "ab".repeat(1024);
        expect(formatBinary({ $binary: hex, length: 2_097_152 })).toBe(
            `0x${"ab".repeat(16)}… (2097152 B)`
        );
    });

    it("returns null for anything that is not the binary envelope", () => {
        // Those fall through to JSON.stringify in the grid.
        expect(formatBinary({ a: 1 })).toBeNull();
        expect(formatBinary({ $binary: "ff" })).toBeNull();
        expect(formatBinary({ length: 3 })).toBeNull();
        expect(formatBinary(null)).toBeNull();
        expect(formatBinary("ff0041")).toBeNull();
        expect(formatBinary(42)).toBeNull();
    });
});
