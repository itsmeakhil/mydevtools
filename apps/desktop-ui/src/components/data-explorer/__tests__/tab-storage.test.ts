import { parseStoredTabs } from "@/lib/data-explorer/tab-storage";

const validTab = {
    id: "c1:orders",
    connectionId: "c1",
    sourceId: "mongodb",
    title: "orders",
    subtitle: "prod › orders",
    connectionColor: "#ff0000",
    state: { dbName: "shop", collectionName: "orders" },
};

describe("parseStoredTabs", () => {
    it("keeps a well-formed tab", () => {
        expect(parseStoredTabs(JSON.stringify([validTab]))).toEqual([validTab]);
    });

    it("returns [] for non-array and unparseable values", () => {
        expect(parseStoredTabs("{}")).toEqual([]);
        expect(parseStoredTabs("null")).toEqual([]);
        expect(parseStoredTabs('"nope"')).toEqual([]);
        expect(parseStoredTabs("not json")).toEqual([]);
    });

    it("drops entries missing fields the shell or panes read", () => {
        const bad = [
            null,
            { ...validTab, id: undefined },
            { ...validTab, connectionId: 7 },
            { ...validTab, sourceId: undefined },
            { ...validTab, title: undefined },
            { ...validTab, state: undefined },
            { ...validTab, state: null },
        ];
        expect(parseStoredTabs(JSON.stringify([...bad, validTab]))).toEqual([validTab]);
    });

    it("drops the retired readOnly snapshot instead of carrying it forward", () => {
        const [restored] = parseStoredTabs(JSON.stringify([{ ...validTab, readOnly: true }]));
        expect(restored).not.toHaveProperty("readOnly");
    });
});
