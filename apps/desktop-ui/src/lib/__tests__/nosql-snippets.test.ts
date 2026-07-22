import { MONGO_OPERATORS, MONGO_SNIPPETS } from "../nosql-snippets";

describe("nosql snippets", () => {
    const all = [...MONGO_OPERATORS, ...MONGO_SNIPPETS];

    it("every entry has a label, docs and insert text", () => {
        for (const c of all) {
            expect(c.label).toBeTruthy();
            expect(c.doc).toBeTruthy();
            expect(c.insertText).toBeTruthy();
        }
    });

    it("labels are unique within each list", () => {
        for (const list of [MONGO_OPERATORS, MONGO_SNIPPETS]) {
            const labels = list.map((c) => c.label);
            expect(new Set(labels).size).toBe(labels.length);
        }
    });

    it("whole-query snippets are valid JSON skeletons", () => {
        // Replace every ${...} tab-stop with 1 (a valid JSON token) so only the
        // authored braces/brackets/quotes are under test.
        for (const c of MONGO_SNIPPETS) {
            const filled = c.insertText.replace(/\$\{[^}]*\}/g, "1");
            expect(() => JSON.parse(filled)).not.toThrow();
        }
    });
});
