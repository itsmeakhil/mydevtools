jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

import { mongodbAdapter } from "../adapters/mongodb";
import messages from "../../../../messages/en.json";

/** Resolve a `DataExplorer`-relative key path, e.g. "validation.connectionStringRequired". */
function resolvesInEnMessages(key: string): boolean {
    const parts = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = (messages as any).DataExplorer;
    for (const part of parts) {
        if (node == null || typeof node !== "object" || !(part in node)) return false;
        node = node[part];
    }
    return typeof node === "string" && node.length > 0;
}

describe("mongodb adapter", () => {
    it("starts blank on the generic dialect", () => {
        expect(mongodbAdapter.blankConfig()).toEqual({ connectionString: "", dbType: "mongodb" });
    });

    it("rejects an empty or non-mongo connection string with a real i18n key", () => {
        const emptyKey = mongodbAdapter.validate({ connectionString: "", dbType: "mongodb" });
        expect(emptyKey).toBe("validation.connectionStringRequired");
        expect(resolvesInEnMessages(emptyKey as string)).toBe(true);

        const schemeKey = mongodbAdapter.validate({
            connectionString: "redis://localhost:6379",
            dbType: "mongodb",
        });
        expect(schemeKey).toBe("validation.connectionStringScheme");
        expect(resolvesInEnMessages(schemeKey as string)).toBe(true);
    });

    it("accepts mongodb:// and mongodb+srv://", () => {
        expect(
            mongodbAdapter.validate({ connectionString: "mongodb://localhost:27017", dbType: "mongodb" })
        ).toBeNull();
        expect(
            mongodbAdapter.validate({
                connectionString: "mongodb+srv://u:p@cluster0.abcde.mongodb.net",
                dbType: "mongodb",
            })
        ).toBeNull();
    });

    it("identifies itself consistently", () => {
        expect(mongodbAdapter.id).toBe("mongodb");
        expect(mongodbAdapter.label).toBe("MongoDB");
    });
});
