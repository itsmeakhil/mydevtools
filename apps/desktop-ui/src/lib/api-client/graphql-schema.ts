/**
 * GraphQL introspection schema model + cursor-aware completion for the query
 * editor. Works on the raw introspection JSON (no graphql-js dependency).
 */

export interface GqlTypeRef {
    kind: string
    name?: string | null
    ofType?: GqlTypeRef | null
}

export interface GqlInputValue {
    name: string
    description?: string | null
    type: GqlTypeRef
    defaultValue?: string | null
}

export interface GqlField {
    name: string
    description?: string | null
    args?: GqlInputValue[]
    type: GqlTypeRef
    isDeprecated?: boolean
    deprecationReason?: string | null
}

export interface GqlType {
    kind: string
    name: string
    description?: string | null
    fields?: GqlField[] | null
    inputFields?: GqlInputValue[] | null
    enumValues?: Array<{ name: string; description?: string | null; isDeprecated?: boolean; deprecationReason?: string | null }> | null
    possibleTypes?: Array<{ name: string }> | null
}

export interface GqlSchema {
    types: GqlType[]
    queryType?: string
    mutationType?: string
    subscriptionType?: string
}

const TYPE_REF = "kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }"
const INPUT_VALUE = `name description defaultValue type { ${TYPE_REF} }`

export const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind name description
      fields(includeDeprecated: true) { name description isDeprecated deprecationReason args { ${INPUT_VALUE} } type { ${TYPE_REF} } }
      inputFields { ${INPUT_VALUE} }
      enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
      possibleTypes { name }
    }
  }
}`

/** Innermost named type (`[User!]!` → `User`). */
export function namedType(ref: GqlTypeRef | null | undefined): string | undefined {
    let r = ref
    while (r && !r.name) r = r.ofType
    return r?.name ?? undefined
}

/** SDL-style label: `[User!]!`. */
export function typeLabel(ref: GqlTypeRef | null | undefined): string {
    if (!ref) return "?"
    if (ref.kind === "NON_NULL") return `${typeLabel(ref.ofType)}!`
    if (ref.kind === "LIST") return `[${typeLabel(ref.ofType)}]`
    return ref.name ?? "?"
}

export function findType(schema: GqlSchema, name: string | undefined): GqlType | undefined {
    return name ? schema.types.find((t) => t.name === name) : undefined
}

export type GqlCompletion =
    | { kind: "fields"; type: GqlType }
    | { kind: "args"; field: GqlField }
    | { kind: "types"; types: GqlType[] }

const isOutputComposite = (t: GqlType) => t.kind === "OBJECT" || t.kind === "INTERFACE" || t.kind === "UNION"
const isInputType = (t: GqlType) => t.kind === "INPUT_OBJECT" || t.kind === "SCALAR" || t.kind === "ENUM"

/**
 * What to suggest at `offset` in `query`: fields of the enclosing selection
 * set's type, arguments inside a field's `( … )`, or type names after `on` /
 * in a variable definition. Returns null where nothing schema-driven applies.
 *
 * ponytail: token walker, not a parser — aliases, fragments, inline fragments
 * and nested argument objects are handled; directives' args are not.
 */
export function completionAt(schema: GqlSchema, query: string, offset: number): GqlCompletion | null {
    const src = query
        .slice(0, offset)
        .replace(/"""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\\n])*"?/g, '""')
        .replace(/#[^\n]*/g, "")
    const tokens = src.match(/\.\.\.|[A-Za-z_][A-Za-z0-9_]*|[{}():$@!=\[\],]|""|-?\d[\w.]*/g) ?? []
    // A partially typed word at the cursor is what's being completed, not context.
    if (tokens.length && /[A-Za-z0-9_]$/.test(src) && /^[A-Za-z_]/.test(tokens[tokens.length - 1])) tokens.pop()

    const stack: Array<GqlType | undefined> = []
    let opKind: string | undefined
    let fragmentOn: string | undefined
    let lastField: string | undefined // field name most recently seen at the current selection level
    const parens: Array<GqlField | undefined | "vars"> = [] // field whose args are open (or operation variables)
    let argBraces = 0 // `{` nested inside an argument value
    let afterColon = false

    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]
        const prev = tokens[i - 1]
        if (parens.length) {
            if (tok === "(") parens.push(undefined)
            else if (tok === ")") { parens.pop(); afterColon = false }
            else if (tok === "{") argBraces++
            else if (tok === "}") argBraces--
            else if (tok === ":") afterColon = true
            else if (tok === ",") afterColon = false
            else if (afterColon && tok !== "$" && tok !== "[" && tok !== "!" && tok !== "]") afterColon = false
            continue
        }
        if (tok === "(") {
            const top = stack[stack.length - 1]
            parens.push(stack.length === 0 ? "vars" : top?.fields?.find((f) => f.name === lastField))
            afterColon = false
            continue
        }
        if (tok === "{") {
            if (stack.length === 0) {
                const root = fragmentOn ?? (opKind === "mutation" ? schema.mutationType : opKind === "subscription" ? schema.subscriptionType : schema.queryType)
                stack.push(findType(schema, root))
            } else if (prev && tokens[i - 2] === "on") {
                stack.push(findType(schema, prev))
            } else {
                const field = stack[stack.length - 1]?.fields?.find((f) => f.name === lastField)
                stack.push(findType(schema, namedType(field?.type)))
            }
            lastField = undefined
            continue
        }
        if (tok === "}") {
            stack.pop()
            lastField = undefined
            if (stack.length === 0) { opKind = undefined; fragmentOn = undefined }
            continue
        }
        if (stack.length === 0) {
            if (tok === "query" || tok === "mutation" || tok === "subscription" || tok === "fragment") opKind = tok
            else if (prev === "on" && opKind === "fragment") fragmentOn = tok
            continue
        }
        // Inside a selection set: a name not preceded by `:` replaces the alias.
        if (/^[A-Za-z_]/.test(tok) && tok !== "on" && prev !== "@" && prev !== "...") lastField = tok
    }

    const prev = tokens[tokens.length - 1]
    if (prev === "on") return { kind: "types", types: schema.types.filter(isOutputComposite) }

    const open = parens[parens.length - 1]
    if (parens.length) {
        if (open === "vars" && parens.length === 1) {
            return afterColon && argBraces === 0 ? { kind: "types", types: schema.types.filter(isInputType) } : null
        }
        if (afterColon || argBraces > 0 || parens.length > 1 || !open || open === "vars") return null
        return { kind: "args", field: open }
    }
    const top = stack[stack.length - 1]
    return top ? { kind: "fields", type: top } : null
}

/** Fields offered for a selection set (`__typename` is valid on every composite). */
export function selectableFields(type: GqlType): GqlField[] {
    const typename: GqlField = { name: "__typename", type: { kind: "NON_NULL", ofType: { kind: "SCALAR", name: "String" } } }
    return [...(type.fields ?? []), typename]
}

/** Types and `Type.field` entries whose name contains `term` (case-insensitive). */
export function searchSchema(schema: GqlSchema, term: string, limit = 50): Array<{ type: string; field?: string }> {
    const q = term.trim().toLowerCase()
    if (!q) return []
    const out: Array<{ type: string; field?: string }> = []
    for (const t of schema.types) {
        if (t.name.toLowerCase().includes(q)) out.push({ type: t.name })
        for (const f of t.fields ?? t.inputFields ?? []) {
            if (f.name.toLowerCase().includes(q)) out.push({ type: t.name, field: f.name })
        }
        if (out.length >= limit) break
    }
    return out.slice(0, limit)
}
