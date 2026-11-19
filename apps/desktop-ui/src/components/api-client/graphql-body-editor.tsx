"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { editor } from "monaco-editor"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { IconBook2, IconChevronRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    completionAt, findType, namedType, searchSchema, selectableFields, typeLabel,
    type GqlField, type GqlInputValue, type GqlSchema, type GqlTypeRef,
} from "@/lib/api-client/graphql-schema"
import { cacheGraphQLSchema, cachedGraphQLSchema, fetchGraphQLSchema } from "@/lib/graphql-introspect"

const CodeEditor = dynamic(
    () => import("@/components/ui/code-editor"),
    { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted/30" /> }
)
const MemoCodeEditor = React.memo(CodeEditor)

type Monaco = typeof import("monaco-editor")

// One provider for every GraphQL editor; each editor maps its model to its schema.
const schemaByModel = new Map<string, () => GqlSchema | undefined>()
let providerRegistered = false

function registerGraphqlCompletion(monaco: Monaco) {
    if (providerRegistered) return
    providerRegistered = true
    const { CompletionItemKind, CompletionItemTag } = monaco.languages
    const doc = (s?: string | null) => (s ? { value: s } : undefined)
    monaco.languages.registerCompletionItemProvider("graphql", {
        triggerCharacters: ["{", "("],
        provideCompletionItems(model, position) {
            const schema = schemaByModel.get(model.uri.toString())?.()
            if (!schema) return { suggestions: [] }
            const ctx = completionAt(schema, model.getValue(), model.getOffsetAt(position))
            if (!ctx) return { suggestions: [] }
            const word = model.getWordUntilPosition(position)
            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
            if (ctx.kind === "fields") {
                return {
                    suggestions: selectableFields(ctx.type).map((f) => ({
                        label: f.name,
                        kind: CompletionItemKind.Field,
                        detail: typeLabel(f.type),
                        documentation: doc(f.deprecationReason ?? f.description),
                        tags: f.isDeprecated ? [CompletionItemTag.Deprecated] : undefined,
                        insertText: f.name,
                        range,
                    })),
                }
            }
            if (ctx.kind === "args") {
                return {
                    suggestions: (ctx.field.args ?? []).map((a) => ({
                        label: a.name,
                        kind: CompletionItemKind.Property,
                        detail: typeLabel(a.type),
                        documentation: doc(a.description),
                        insertText: `${a.name}: `,
                        range,
                    })),
                }
            }
            return {
                suggestions: ctx.types.map((t) => ({
                    label: t.name,
                    kind: CompletionItemKind.Class,
                    detail: t.kind.toLowerCase(),
                    documentation: doc(t.description),
                    insertText: t.name,
                    range,
                })),
            }
        },
    })
}

interface GraphqlBodyEditorProps {
    query: string
    onQueryChange: (v: string) => void
    variables: string
    onVariablesChange: (v: string) => void
    /** Tab URL as typed — the schema cache key. */
    url?: string
    schema?: GqlSchema
    setSchema?: (s: GqlSchema) => void
    /** Resolves URL + headers (vars, auth) for the introspection request. */
    resolveTarget?: () => Promise<{ url: string; headers: Record<string, string> }>
}

export function GraphqlBodyEditor({ query, onQueryChange, variables, onVariablesChange, url, schema: tabSchema, setSchema, resolveTarget }: GraphqlBodyEditorProps) {
    const t = useTranslations("ApiClient.graphql")
    const schema = tabSchema ?? cachedGraphQLSchema(url)
    const schemaRef = React.useRef(schema)
    React.useEffect(() => { schemaRef.current = schema }, [schema])

    const [fetching, setFetching] = React.useState(false)
    const [docsOpen, setDocsOpen] = React.useState(false)

    const handleFetch = async () => {
        if (!url || !setSchema) return
        setFetching(true)
        try {
            const target = resolveTarget ? await resolveTarget() : { url, headers: {} }
            const result = await fetchGraphQLSchema(target)
            cacheGraphQLSchema(url, result)
            setSchema(result)
            toast.success(t("fetched", { count: result.types.length }))
        } catch (e) {
            toast.error(t("fetchFailed", { message: (e as Error).message }))
        } finally {
            setFetching(false)
        }
    }

    const modelKeyRef = React.useRef<string | null>(null)
    React.useEffect(() => () => { if (modelKeyRef.current) schemaByModel.delete(modelKeyRef.current) }, [])
    const handleMount = React.useCallback((ed: editor.IStandaloneCodeEditor) => {
        const key = ed.getModel()?.uri.toString()
        if (!key) return
        modelKeyRef.current = key
        schemaByModel.set(key, () => schemaRef.current)
    }, [])

    return (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground flex-1 min-w-[260px]">
                    {t.rich("sentAs", {
                        json: () => <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">application/json</code>,
                        shape: () => <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">{"{ query, variables }"}</code>,
                    })}
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFetch}
                    disabled={!url || fetching}
                    title={!url ? t("needUrl") : t("fetchHint")}
                >
                    {fetching ? t("fetching") : t("fetchSchema")}
                </Button>
                <Button
                    size="sm"
                    variant={docsOpen ? "secondary" : "outline"}
                    onClick={() => setDocsOpen((o) => !o)}
                    disabled={!schema}
                    aria-pressed={docsOpen}
                    title={!schema ? t("docsNeedSchema") : undefined}
                >
                    <IconBook2 className="h-4 w-4 mr-1.5" />
                    {t("docs")}
                </Button>
            </div>
            <div className={cn("flex-1 min-h-0 grid gap-2", docsOpen && schema && "grid-cols-[minmax(0,1fr)_minmax(220px,300px)]")}>
                {/* minmax(0,1fr) + min-w-0: Monaco keeps its old pixel width and would otherwise spill over the docs panel. */}
                <div className="min-h-0 min-w-0 grid grid-cols-[minmax(0,1fr)] grid-rows-[2fr_1fr] gap-2">
                    <div className="border border-border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={query}
                            onChange={onQueryChange}
                            language="graphql"
                            beforeMount={registerGraphqlCompletion}
                            onMount={handleMount}
                        />
                    </div>
                    <div className="flex flex-col gap-1 min-h-0">
                        <Label className="text-[11px] font-medium text-muted-foreground">{t("variables")}</Label>
                        <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                            <MemoCodeEditor value={variables} onChange={onVariablesChange} language="json" />
                        </div>
                    </div>
                </div>
                {docsOpen && schema && <GraphqlDocs schema={schema} />}
            </div>
        </div>
    )
}

function GraphqlDocs({ schema }: { schema: GqlSchema }) {
    const t = useTranslations("ApiClient.graphql")
    const [path, setPath] = React.useState<string[]>([])
    const [search, setSearch] = React.useState("")
    const current = findType(schema, path[path.length - 1])
    const open = (name: string | undefined) => {
        if (!findType(schema, name)) return
        setPath((p) => [...p, name!])
        setSearch("")
    }
    const results = React.useMemo(() => searchSchema(schema, search), [schema, search])
    const roots = ([["query", schema.queryType], ["mutation", schema.mutationType], ["subscription", schema.subscriptionType]] as const)
        .filter(([, name]) => name && findType(schema, name))

    const TypeLink = ({ type }: { type: GqlTypeRef }) => {
        const name = namedType(type)
        const known = !!findType(schema, name)
        return known
            ? <button type="button" className="text-primary hover:underline" onClick={() => open(name)}>{typeLabel(type)}</button>
            : <span className="text-muted-foreground">{typeLabel(type)}</span>
    }
    const Args = ({ args }: { args?: GqlInputValue[] }) => !args?.length ? null : (
        <>({args.map((a, i) => (
            <React.Fragment key={a.name}>{i > 0 && ", "}<span>{a.name}</span>: <TypeLink type={a.type} />{a.defaultValue != null && <span className="text-muted-foreground"> = {a.defaultValue}</span>}</React.Fragment>
        ))})</>
    )
    const Entry = ({ field }: { field: GqlField | GqlInputValue }) => {
        const f = field as GqlField
        return (
            <li className="px-3 py-2">
                <div className="font-mono text-xs break-words">
                    <span className={cn("text-foreground", f.isDeprecated && "line-through")}>{f.name}</span>
                    <Args args={f.args} />: <TypeLink type={f.type} />
                </div>
                {f.isDeprecated && (
                    <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px]">{t("deprecated")}</Badge>
                        {f.deprecationReason && <span className="text-[11px] text-muted-foreground">{f.deprecationReason}</span>}
                    </div>
                )}
                {f.description && <p className="mt-1 text-[12px] text-muted-foreground whitespace-pre-wrap">{f.description}</p>}
            </li>
        )
    }

    return (
        <aside className="min-h-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden" aria-label={t("docs")}>
            <nav className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-border text-[13px]">
                <button type="button" className={cn("hover:underline", path.length ? "text-muted-foreground" : "font-semibold")} onClick={() => setPath([])}>
                    {t("root")}
                </button>
                {path.map((name, i) => (
                    <React.Fragment key={`${name}-${i}`}>
                        <IconChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <button
                            type="button"
                            className={cn("font-mono text-xs hover:underline", i === path.length - 1 ? "font-semibold" : "text-muted-foreground")}
                            onClick={() => setPath((p) => p.slice(0, i + 1))}
                        >
                            {name}
                        </button>
                    </React.Fragment>
                ))}
            </nav>
            <div className="p-2 border-b border-border">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-8 text-[13px]" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {search.trim() ? (
                    results.length ? (
                        <ul>
                            {results.map((r) => (
                                <li key={`${r.type}.${r.field ?? ""}`}>
                                    <button type="button" className="w-full text-left px-3 py-1.5 font-mono text-xs hover:bg-foreground/[0.05]" onClick={() => open(r.type)}>
                                        {r.type}{r.field && <span className="text-muted-foreground">.{r.field}</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="px-3 py-4 text-[13px] text-muted-foreground">{t("noResults")}</p>
                ) : !current ? (
                    <ul className="py-1">
                        {roots.map(([op, name]) => (
                            <li key={op}>
                                <button type="button" className="w-full text-left px-3 py-1.5 font-mono text-xs hover:bg-foreground/[0.05]" onClick={() => open(name)}>
                                    <span className="text-muted-foreground">{op}: </span><span className="text-primary">{name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div>
                        <div className="px-3 pt-3 pb-2">
                            <div className="text-[11px] text-muted-foreground">{current.kind.toLowerCase().replace("_", " ")}</div>
                            {current.description && <p className="mt-1 text-[12px] text-muted-foreground whitespace-pre-wrap">{current.description}</p>}
                        </div>
                        {current.fields && current.fields.length > 0 && (
                            <Section title={t("fields")}>{current.fields.map((f) => <Entry key={f.name} field={f} />)}</Section>
                        )}
                        {current.inputFields && current.inputFields.length > 0 && (
                            <Section title={t("inputFields")}>{current.inputFields.map((f) => <Entry key={f.name} field={f} />)}</Section>
                        )}
                        {current.enumValues && current.enumValues.length > 0 && (
                            <Section title={t("values")}>
                                {current.enumValues.map((v) => (
                                    <li key={v.name} className="px-3 py-2">
                                        <div className={cn("font-mono text-xs", v.isDeprecated && "line-through")}>{v.name}</div>
                                        {v.isDeprecated && <Badge variant="secondary" className="mt-1 text-[11px]">{t("deprecated")}</Badge>}
                                        {(v.deprecationReason || v.description) && <p className="mt-1 text-[12px] text-muted-foreground">{v.deprecationReason ?? v.description}</p>}
                                    </li>
                                ))}
                            </Section>
                        )}
                        {current.possibleTypes && current.possibleTypes.length > 0 && (
                            <Section title={t("possibleTypes")}>
                                {current.possibleTypes.map((p) => (
                                    <li key={p.name} className="px-3 py-1.5 font-mono text-xs"><TypeLink type={{ kind: "OBJECT", name: p.name }} /></li>
                                ))}
                            </Section>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h4 className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{title}</h4>
            <ul className="divide-y divide-border">{children}</ul>
        </section>
    )
}
