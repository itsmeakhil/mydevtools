import { detectDbType, normalizeConnectionString, DB_DIALECTS, DB_TYPE_ORDER } from "../nosql-dialects";

describe("detectDbType", () => {
    it("infers Cosmos DB from its managed host", () => {
        expect(
            detectDbType("mongodb://a:b@acct.mongo.cosmos.azure.com:10255/?ssl=true")
        ).toBe("cosmosdb");
    });

    it("infers DocumentDB from its managed host (classic and elastic)", () => {
        expect(
            detectDbType("mongodb://u:p@cluster.docdb.us-east-1.amazonaws.com:27017/?tls=true")
        ).toBe("documentdb");
        expect(
            detectDbType("mongodb://u:p@x.docdb-elastic.us-east-1.amazonaws.com:27017/")
        ).toBe("documentdb");
    });

    it("falls back to mongodb for generic/self-hosted hosts", () => {
        expect(detectDbType("mongodb://localhost:27017")).toBe("mongodb");
        expect(detectDbType("mongodb+srv://user:pass@cluster0.abcde.mongodb.net")).toBe("mongodb");
        expect(detectDbType("")).toBe("mongodb");
        expect(detectDbType("garbage")).toBe("mongodb");
    });

    it("keeps every dialect in the picker order and vice versa", () => {
        expect(DB_TYPE_ORDER.sort()).toEqual(
            (Object.keys(DB_DIALECTS) as (keyof typeof DB_DIALECTS)[]).sort()
        );
    });
});

describe("normalizeConnectionString", () => {
    it("appends retryWrites=false for DocumentDB/Cosmos, picking the right separator", () => {
        expect(normalizeConnectionString("documentdb", "mongodb://h:27017")).toBe(
            "mongodb://h:27017?retryWrites=false"
        );
        expect(normalizeConnectionString("cosmosdb", "mongodb://h:10255/?ssl=true")).toBe(
            "mongodb://h:10255/?ssl=true&retryWrites=false"
        );
    });

    it("respects a user-set retryWrites and trims", () => {
        expect(normalizeConnectionString("documentdb", " mongodb://h/?retryWrites=true ")).toBe(
            "mongodb://h/?retryWrites=true"
        );
    });

    it("leaves mongodb/ferretdb untouched", () => {
        expect(normalizeConnectionString("mongodb", "mongodb://h:27017")).toBe("mongodb://h:27017");
        expect(normalizeConnectionString("ferretdb", "mongodb://h:27017")).toBe("mongodb://h:27017");
    });
});
