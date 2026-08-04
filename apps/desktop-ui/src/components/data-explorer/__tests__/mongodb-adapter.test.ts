jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

import { mongodbAdapter } from "../adapters/mongodb";

describe("mongodb adapter", () => {
    it("starts blank on the generic dialect", () => {
        expect(mongodbAdapter.blankConfig()).toEqual({ connectionString: "", dbType: "mongodb" });
    });

    it("rejects an empty or non-mongo connection string", () => {
        expect(mongodbAdapter.validate({ connectionString: "", dbType: "mongodb" })).toBeTruthy();
        expect(
            mongodbAdapter.validate({ connectionString: "redis://localhost:6379", dbType: "mongodb" })
        ).toBeTruthy();
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
