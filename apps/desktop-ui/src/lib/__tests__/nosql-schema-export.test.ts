import { dominantType, toJsonSchema, toMongoose, toHtml, SchemaExportField } from "../nosql-schema-export";

const fields: SchemaExportField[] = [
    { name: "_id", types: { ObjectId: 10 }, coverage: 100 },
    { name: "name", types: { string: 9, null: 1 }, coverage: 100 },
    { name: "age", types: { number: 8 }, coverage: 80 },
    { name: "created", types: { Date: 10 }, coverage: 100 },
    { name: "tags", types: { Array: 7 }, coverage: 70 },
];

describe("dominantType", () => {
    it("ignores null and picks the most common type", () => {
        expect(dominantType({ string: 9, null: 5 })).toBe("string");
        expect(dominantType({ null: 3 })).toBe("null");
    });
});

describe("toJsonSchema", () => {
    it("is valid JSON with mapped types and required = full-coverage fields", () => {
        const parsed = JSON.parse(toJsonSchema(fields, "users"));
        expect(parsed.title).toBe("users");
        expect(parsed.properties.age).toEqual({ type: "number" });
        expect(parsed.properties.created).toEqual({ type: "string", format: "date-time" });
        expect(parsed.required).toContain("name");
        expect(parsed.required).not.toContain("age"); // 80% coverage
    });
});

describe("toMongoose", () => {
    it("maps types, drops _id, and exports a model", () => {
        const code = toMongoose(fields, "users");
        expect(code).toContain('"age": Number');
        expect(code).toContain('"created": Date');
        expect(code).not.toMatch(/"_id":/); // _id dropped from the model
        expect(code).toContain('mongoose.model("Users"');
    });
});

describe("toHtml", () => {
    it("escapes and includes every field", () => {
        const html = toHtml([{ name: "a<b>", types: { string: 1 }, coverage: 100 }], "c");
        expect(html).toContain("a&lt;b&gt;");
        expect(html).toContain("<!doctype html>");
    });
});
