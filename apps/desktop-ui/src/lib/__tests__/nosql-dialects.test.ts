import { detectDbType, DB_DIALECTS, DB_TYPE_ORDER } from "../nosql-dialects";

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
