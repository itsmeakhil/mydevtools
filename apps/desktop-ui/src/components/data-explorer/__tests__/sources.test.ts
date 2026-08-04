// sources.ts now pulls in a real adapter (mongodb.tsx) whose form uses
// next-intl; mock it per this repo's established pattern for test files that
// transitively import a next-intl-consuming component (see
// api-client/__tests__/collections-context.test.ts).
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
// The Redis adapter's pane imports @/components/ui/resizable, whose
// react-resizable-panels build ships as ESM and cannot be parsed under this
// node-environment jest config. The registry tests never render, so stub it.
jest.mock("react-resizable-panels", () => ({
    Panel: () => null,
    PanelGroup: () => null,
    PanelResizeHandle: () => null,
}))

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
