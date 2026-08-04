import { SOURCES, SOURCE_ORDER, getAdapter } from "../sources";

describe("source registry", () => {
    it("keys every adapter by its own id", () => {
        for (const [key, adapter] of Object.entries(SOURCES)) {
            expect(adapter.id).toBe(key);
        }
    });

    it("orders exactly the registered sources, no more, no less", () => {
        expect([...SOURCE_ORDER].sort()).toEqual(Object.keys(SOURCES).sort());
    });

    it("gives every adapter the full contract", () => {
        for (const adapter of Object.values(SOURCES)) {
            expect(typeof adapter.label).toBe("string");
            expect(adapter.label.length).toBeGreaterThan(0);
            expect(typeof adapter.accent).toBe("string");
            expect(typeof adapter.blankConfig).toBe("function");
            expect(typeof adapter.validate).toBe("function");
            expect(typeof adapter.testConnection).toBe("function");
            expect(adapter.icon).toBeDefined();
            expect(adapter.ConnectionForm).toBeDefined();
            expect(adapter.SidebarTree).toBeDefined();
            expect(adapter.Pane).toBeDefined();
        }
    });

    it("returns null for an unknown source instead of throwing", () => {
        expect(getAdapter("not-a-real-source")).toBeNull();
    });
});
