import { completionAt, namedType, searchSchema, selectableFields, typeLabel, type GqlSchema, type GqlTypeRef } from "../graphql-schema"

const named = (name: string, kind = "OBJECT"): GqlTypeRef => ({ kind, name })
const nonNull = (ofType: GqlTypeRef): GqlTypeRef => ({ kind: "NON_NULL", ofType })
const list = (ofType: GqlTypeRef): GqlTypeRef => ({ kind: "LIST", ofType })

const schema: GqlSchema = {
    queryType: "Query",
    mutationType: "Mutation",
    types: [
        {
            kind: "OBJECT", name: "Query", fields: [
                { name: "user", args: [{ name: "id", type: nonNull(named("ID", "SCALAR")) }], type: named("User") },
                { name: "users", args: [{ name: "filter", type: named("UserFilter", "INPUT_OBJECT") }, { name: "first", type: named("Int", "SCALAR") }], type: nonNull(list(nonNull(named("User")))) },
                { name: "node", args: [], type: named("Node", "INTERFACE") },
            ],
        },
        { kind: "OBJECT", name: "Mutation", fields: [{ name: "createUser", args: [{ name: "name", type: named("String", "SCALAR") }], type: named("User") }] },
        {
            kind: "OBJECT", name: "User", fields: [
                { name: "id", type: nonNull(named("ID", "SCALAR")) },
                { name: "name", type: named("String", "SCALAR"), isDeprecated: true, deprecationReason: "use fullName" },
                { name: "posts", args: [{ name: "first", type: named("Int", "SCALAR") }], type: list(named("Post")) },
            ],
        },
        { kind: "OBJECT", name: "Post", fields: [{ name: "title", type: named("String", "SCALAR") }, { name: "author", type: named("User") }] },
        { kind: "INTERFACE", name: "Node", fields: [{ name: "id", type: nonNull(named("ID", "SCALAR")) }] },
        { kind: "INPUT_OBJECT", name: "UserFilter", inputFields: [{ name: "nameContains", type: named("String", "SCALAR") }] },
        { kind: "SCALAR", name: "ID" },
        { kind: "SCALAR", name: "String" },
        { kind: "SCALAR", name: "Int" },
    ],
}

/** Completion at the `|` marker. */
const at = (q: string) => completionAt(schema, q.replace("|", ""), q.indexOf("|"))
const fieldsOf = (q: string) => {
    const c = at(q)
    return c?.kind === "fields" ? c.type.name : c?.kind ?? null
}

describe("graphql-schema", () => {
    it("labels and unwraps type refs", () => {
        const ref = nonNull(list(nonNull(named("User"))))
        expect(typeLabel(ref)).toBe("[User!]!")
        expect(namedType(ref)).toBe("User")
    })

    it("follows selection-set nesting from the root operation type", () => {
        expect(fieldsOf("{ |")).toBe("Query")
        expect(fieldsOf("query Q { us|")).toBe("Query")
        expect(fieldsOf("{ user(id: 1) { |")).toBe("User")
        expect(fieldsOf("{ user(id: 1) { posts { |")).toBe("Post")
        expect(fieldsOf("{ user(id: 1) { posts { author { na|")).toBe("User")
        expect(fieldsOf("{ user(id: 1) { posts { title } |")).toBe("User")
        expect(fieldsOf("mutation { createUser(name: \"a{\") { |")).toBe("User")
        expect(fieldsOf("{ me: user(id: 1) { |")).toBe("User")
    })

    it("uses the type condition of fragments and inline fragments", () => {
        expect(fieldsOf("fragment F on Post { |")).toBe("Post")
        expect(fieldsOf("{ node { ... on User { |")).toBe("User")
        expect(fieldsOf("{ node { id } } fragment F on User { posts { |")).toBe("Post")
    })

    it("offers arguments inside a field's parentheses, not in value position", () => {
        const c = at("{ users(|")
        expect(c?.kind === "args" && c.field.args?.map((a) => a.name)).toEqual(["filter", "first"])
        expect(at("{ users(first: 1, |")?.kind).toBe("args")
        expect(at("{ users(first: |")).toBeNull()
        expect(at("{ users(filter: { |")).toBeNull()
    })

    it("offers type names after `on` and in variable definitions", () => {
        const on = at("{ node { ... on |")
        expect(on?.kind === "types" && on.types.map((t) => t.name)).toEqual(["Query", "Mutation", "User", "Post", "Node"])
        const vars = at("query Q($f: |")
        expect(vars?.kind === "types" && vars.types.map((t) => t.name)).toEqual(["UserFilter", "ID", "String", "Int"])
        expect(at("query Q($f: UserFilter, $|")).toBeNull()
    })

    it("ignores braces in comments and strings", () => {
        expect(fieldsOf("# { {\n{ user(id: \"}\") { |")).toBe("User")
    })

    it("returns null outside any selection set", () => {
        expect(at("|")).toBeNull()
        expect(at("{ user { id } } |")).toBeNull()
    })

    it("adds __typename and searches types and fields", () => {
        expect(selectableFields(schema.types[3]).map((f) => f.name)).toEqual(["title", "author", "__typename"])
        expect(searchSchema(schema, "user")).toEqual([
            { type: "Query", field: "user" },
            { type: "Query", field: "users" },
            { type: "Mutation", field: "createUser" },
            { type: "User" },
            { type: "UserFilter" },
        ])
    })
})
