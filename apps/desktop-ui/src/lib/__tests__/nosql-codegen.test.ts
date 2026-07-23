import { generateCode, CODEGEN_LANGS, CodegenInput } from "../nosql-codegen";

const findInput: CodegenInput = {
    db: "shop",
    collection: "orders",
    kind: "find",
    body: '{"status": "active", "qty": {"$gt": 5}, "paid": true, "note": null}',
};

const aggInput: CodegenInput = {
    db: "shop",
    collection: "orders",
    kind: "aggregate",
    body: '[{"$group": {"_id": "$status", "count": {"$sum": 1}}}]',
};

describe("generateCode", () => {
    it("emits non-empty code with db + collection for every language, find & aggregate", () => {
        for (const { id } of CODEGEN_LANGS) {
            for (const input of [findInput, aggInput]) {
                const code = generateCode(id, input);
                expect(code).toBeTruthy();
                expect(code).toContain("orders");
            }
        }
    });

    it("shell find/aggregate use the right method", () => {
        expect(generateCode("shell", findInput)).toContain(".find(");
        expect(generateCode("shell", aggInput)).toContain(".aggregate(");
    });

    it("python converts JSON literals to Python", () => {
        const code = generateCode("python", findInput);
        expect(code).toContain("True");
        expect(code).toContain("None");
        expect(code).not.toMatch(/\btrue\b/);
        expect(code).not.toMatch(/\bnull\b/);
    });

    it("rejects a non-array aggregate body", () => {
        expect(() => generateCode("node", { ...aggInput, body: '{"$group": {}}' })).toThrow();
    });

    it("escapes embedded JSON into a valid double-quoted literal (java)", () => {
        const code = generateCode("java", findInput);
        // The Document.parse argument must be a quoted string with escaped inner quotes.
        expect(code).toContain('Document.parse("');
        expect(code).toContain('\\"status\\"');
    });
});
