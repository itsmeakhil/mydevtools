// Turn nosql-explorer schema analysis into exportable artifacts: JSON Schema,
// a Mongoose model, or a standalone HTML report. Pure + testable.

export interface SchemaExportField {
    name: string;
    /** bucketed type → count across the sample (e.g. {string: 10, null: 1}). */
    types: Record<string, number>;
    /** 0-100 percentage of sampled docs that had this field. */
    coverage: number;
}

export type SchemaExportFormat = "jsonSchema" | "mongoose" | "html";

/** The single most common non-null type in the sample. */
export function dominantType(types: Record<string, number>): string {
    const entries = Object.entries(types).filter(([t]) => t !== "null");
    if (entries.length === 0) return "null";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// bucket type (from the Rust analyzer) → JSON Schema type + optional format.
const JSON_SCHEMA_TYPE: Record<string, { type: string; format?: string }> = {
    string: { type: "string" },
    number: { type: "number" },
    boolean: { type: "boolean" },
    ObjectId: { type: "string" },
    Date: { type: "string", format: "date-time" },
    Array: { type: "array" },
    Object: { type: "object" },
    null: { type: "null" },
};

// bucket type → Mongoose schema type expression.
const MONGOOSE_TYPE: Record<string, string> = {
    string: "String",
    number: "Number",
    boolean: "Boolean",
    ObjectId: "mongoose.Schema.Types.ObjectId",
    Date: "Date",
    Array: "Array",
    Object: "Object",
    null: "mongoose.Schema.Types.Mixed",
};

export function toJsonSchema(fields: SchemaExportField[], collection: string): string {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const f of fields) {
        const t = JSON_SCHEMA_TYPE[dominantType(f.types)] ?? { type: "string" };
        properties[f.name] = t.format ? { type: t.type, format: t.format } : { type: t.type };
        if (f.coverage >= 100) required.push(f.name);
    }
    return JSON.stringify(
        {
            $schema: "http://json-schema.org/draft-07/schema#",
            title: collection,
            type: "object",
            properties,
            ...(required.length ? { required } : {}),
        },
        null,
        2,
    );
}

export function toMongoose(fields: SchemaExportField[], collection: string): string {
    const lines = fields
        .filter((f) => f.name !== "_id")
        .map((f) => `  ${JSON.stringify(f.name)}: ${MONGOOSE_TYPE[dominantType(f.types)] ?? "mongoose.Schema.Types.Mixed"}`);
    const model = collection.charAt(0).toUpperCase() + collection.slice(1);
    return [
        `const mongoose = require("mongoose");`,
        ``,
        `const ${collection}Schema = new mongoose.Schema({`,
        lines.join(",\n"),
        `});`,
        ``,
        `module.exports = mongoose.model(${JSON.stringify(model)}, ${collection}Schema);`,
    ].join("\n");
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toHtml(fields: SchemaExportField[], collection: string): string {
    const rows = fields
        .map((f) => {
            const types = Object.entries(f.types)
                .map(([t, n]) => `${esc(t)} ×${n}`)
                .join(", ");
            return `<tr><td class="mono">${esc(f.name)}</td><td>${types}</td><td class="num">${f.coverage}%</td></tr>`;
        })
        .join("\n");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Schema · ${esc(collection)}</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.25rem; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e2e2e2; }
  th { font-size: 12px; text-transform: uppercase; color: #666; }
  .mono { font-family: ui-monospace, monospace; }
  .num { text-align: right; font-family: ui-monospace, monospace; color: #666; }
</style>
</head>
<body>
<h1>Schema report — ${esc(collection)}</h1>
<p>${fields.length} field(s).</p>
<table>
<thead><tr><th>Field</th><th>Types</th><th>Coverage</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`;
}

export function generateSchemaExport(format: SchemaExportFormat, fields: SchemaExportField[], collection: string): { content: string; ext: string; mime: string } {
    switch (format) {
        case "jsonSchema":
            return { content: toJsonSchema(fields, collection), ext: "schema.json", mime: "application/json" };
        case "mongoose":
            return { content: toMongoose(fields, collection), ext: "model.js", mime: "text/javascript" };
        case "html":
            return { content: toHtml(fields, collection), ext: "schema.html", mime: "text/html" };
    }
}
