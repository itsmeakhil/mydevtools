jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

import { mongodbAdapter, mongoNameErrorKey } from "../adapters/mongodb";
import { validateCollectionName, validateDbName } from "@/lib/nosql-error-sanitizer";
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

    // The mapper matches on the validator's English prose, so it breaks silently
    // if that prose changes. This locks each failure mode to a distinct, real key.
    it("maps every name-validator failure mode to its own existing key", () => {
        const cases: Array<[string, string]> = [
            [mongoNameErrorKey(validateDbName("")), "mongo.toast.nameEmpty"],
            [mongoNameErrorKey(validateDbName("d".repeat(65))), "mongo.toast.nameTooLong"],
            [mongoNameErrorKey(validateDbName("bad/name")), "mongo.toast.nameForbiddenChars"],
            [mongoNameErrorKey(validateCollectionName("a\0b")), "mongo.toast.nameNullChar"],
            [mongoNameErrorKey(validateCollectionName("$reserved")), "mongo.toast.nameReservedPrefix"],
            [mongoNameErrorKey(validateCollectionName("c".repeat(121))), "mongo.toast.nameTooLong"],
        ];
        for (const [actual, expected] of cases) {
            expect(actual).toBe(expected);
            expect(resolvesInEnMessages(actual)).toBe(true);
        }
        expect(resolvesInEnMessages("mongo.toast.nameInvalid")).toBe(true);
        expect(resolvesInEnMessages("mongo.toast.nameConsecutiveDots")).toBe(true);
    });

    it("identifies itself consistently", () => {
        expect(mongodbAdapter.id).toBe("mongodb");
        expect(mongodbAdapter.label).toBe("MongoDB");
    });
});
