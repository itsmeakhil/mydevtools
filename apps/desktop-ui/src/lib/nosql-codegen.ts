// Generate driver code for a MongoDB find filter or aggregation pipeline in
// several languages (nosql-explorer "Generate code"). Pure + testable.
//
// shell/node/python are emitted idiomatically. For java/csharp/php/ruby/go we
// embed the query as a JSON string and parse it with the driver's document
// parser — concise, correct, and how a lot of real code actually does it,
// rather than hand-building deeply-nested typed builders.

export type CodegenLang = "shell" | "node" | "python" | "java" | "csharp" | "php" | "ruby" | "go";

export interface CodegenInput {
    db: string;
    collection: string;
    kind: "find" | "aggregate";
    /** JSON string: a filter object (find) or a pipeline array (aggregate). */
    body: string;
}

export const CODEGEN_LANGS: { id: CodegenLang; label: string }[] = [
    { id: "shell", label: "Mongo Shell" },
    { id: "node", label: "Node.js" },
    { id: "python", label: "Python" },
    { id: "java", label: "Java" },
    { id: "csharp", label: "C#" },
    { id: "php", label: "PHP" },
    { id: "ruby", label: "Ruby" },
    { id: "go", label: "Go" },
];

/** Parse the query body; throws for invalid JSON so the caller can surface it. */
function parseBody(input: CodegenInput): unknown {
    const parsed = JSON.parse(input.body || (input.kind === "aggregate" ? "[]" : "{}"));
    if (input.kind === "aggregate" && !Array.isArray(parsed)) {
        throw new Error("Aggregation body must be a JSON array");
    }
    return parsed;
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2);
const minified = (v: unknown) => JSON.stringify(v);

/** JSON value → Python literal (true→True, null→None, dict/list). */
function pyLiteral(v: unknown, indent = 0): string {
    const pad = "    ".repeat(indent);
    const padIn = "    ".repeat(indent + 1);
    if (v === null) return "None";
    if (v === true) return "True";
    if (v === false) return "False";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) {
        if (v.length === 0) return "[]";
        return "[\n" + v.map((x) => padIn + pyLiteral(x, indent + 1)).join(",\n") + "\n" + pad + "]";
    }
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return "{\n" + entries.map(([k, val]) => `${padIn}${JSON.stringify(k)}: ${pyLiteral(val, indent + 1)}`).join(",\n") + "\n" + pad + "}";
}

/** Embed a JSON string as a double-quoted literal for the given language. */
function dq(json: string): string {
    return '"' + json.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

export function generateCode(lang: CodegenLang, input: CodegenInput): string {
    const value = parseBody(input);
    const { db, collection, kind } = input;
    const bodyPretty = pretty(value);
    const bodyMin = minified(value);
    const find = kind === "find";

    switch (lang) {
        case "shell":
            return find
                ? `db.getSiblingDB(${JSON.stringify(db)}).${collection}.find(${bodyPretty})`
                : `db.getSiblingDB(${JSON.stringify(db)}).${collection}.aggregate(${bodyPretty})`;

        case "node":
            return [
                `const { MongoClient } = require("mongodb");`,
                ``,
                `const client = new MongoClient("mongodb://localhost:27017");`,
                `await client.connect();`,
                `const coll = client.db(${JSON.stringify(db)}).collection(${JSON.stringify(collection)});`,
                ``,
                find
                    ? `const results = await coll.find(${bodyPretty}).toArray();`
                    : `const results = await coll.aggregate(${bodyPretty}).toArray();`,
                `console.log(results);`,
            ].join("\n");

        case "python":
            return [
                `from pymongo import MongoClient`,
                ``,
                `client = MongoClient("mongodb://localhost:27017")`,
                `coll = client[${JSON.stringify(db)}][${JSON.stringify(collection)}]`,
                ``,
                find
                    ? `results = list(coll.find(${pyLiteral(value)}))`
                    : `results = list(coll.aggregate(${pyLiteral(value)}))`,
                `print(results)`,
            ].join("\n");

        case "java":
            return find
                ? [
                      `MongoCollection<Document> coll = mongoClient`,
                      `    .getDatabase(${JSON.stringify(db)})`,
                      `    .getCollection(${JSON.stringify(collection)});`,
                      ``,
                      `Bson filter = Document.parse(${dq(bodyMin)});`,
                      `List<Document> results = coll.find(filter).into(new ArrayList<>());`,
                  ].join("\n")
                : [
                      `MongoCollection<Document> coll = mongoClient`,
                      `    .getDatabase(${JSON.stringify(db)})`,
                      `    .getCollection(${JSON.stringify(collection)});`,
                      ``,
                      `List<Bson> pipeline = BsonArray.parse(${dq(bodyMin)}).stream()`,
                      `    .map(v -> (Bson) v.asDocument()).collect(Collectors.toList());`,
                      `List<Document> results = coll.aggregate(pipeline).into(new ArrayList<>());`,
                  ].join("\n");

        case "csharp":
            return [
                `var coll = client.GetDatabase(${JSON.stringify(db)})`,
                `    .GetCollection<BsonDocument>(${JSON.stringify(collection)});`,
                ``,
                find
                    ? `var filter = BsonDocument.Parse(${dq(bodyMin)});\nvar results = coll.Find(filter).ToList();`
                    : `var pipeline = BsonSerializer.Deserialize<BsonDocument[]>(${dq(bodyMin)})\n    .Select(d => (BsonDocument)d).ToArray();\nvar results = coll.Aggregate<BsonDocument>(pipeline).ToList();`,
            ].join("\n");

        case "php":
            return [
                `<?php`,
                `$client = new MongoDB\\Client("mongodb://localhost:27017");`,
                `$coll = $client->selectCollection(${JSON.stringify(db)}, ${JSON.stringify(collection)});`,
                ``,
                `$query = json_decode(${dq(bodyMin)}, true);`,
                find
                    ? `$results = $coll->find($query)->toArray();`
                    : `$results = $coll->aggregate($query)->toArray();`,
            ].join("\n");

        case "ruby":
            return [
                `require "mongo"`,
                ``,
                `client = Mongo::Client.new("mongodb://localhost:27017/${db}")`,
                `coll = client[${JSON.stringify(collection)}]`,
                ``,
                `query = JSON.parse(${dq(bodyMin)})`,
                find
                    ? `results = coll.find(query).to_a`
                    : `results = coll.aggregate(query).to_a`,
            ].join("\n");

        case "go":
            return [
                `coll := client.Database(${JSON.stringify(db)}).Collection(${JSON.stringify(collection)})`,
                ``,
                find
                    ? `var filter bson.M\nbson.UnmarshalExtJSON([]byte(\`${bodyMin}\`), true, &filter)\ncursor, err := coll.Find(context.TODO(), filter)`
                    : `var pipeline []bson.M\nbson.UnmarshalExtJSON([]byte(\`${bodyMin}\`), true, &pipeline)\ncursor, err := coll.Aggregate(context.TODO(), pipeline)`,
            ].join("\n");
    }
}
