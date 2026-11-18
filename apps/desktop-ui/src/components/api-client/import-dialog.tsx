"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { detectImportFormat, type ImportFormat } from "@/lib/import/detect"
import { importPostmanCollectionWithMeta } from "@/lib/import/postman"
import { importHar } from "@/lib/import/har"
import { importOpenApiSpec } from "@/lib/import/openapi"
import { importPostmanEnvironment } from "@/lib/import/postman-env"
import { importInsomniaWithMeta } from "@/lib/import/insomnia"
import { importBrunoFolder } from "@/lib/import/bruno"
import { generateMockExamplesFromOpenApi } from "@/lib/mocks/openapi-mock-gen"
import { useCollectionsActions } from "./context/collections-context"
import { useEnvironmentsActions } from "./context/environments-context"
import type { EnvironmentVariable } from "./use-environments"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { isDesktop } from "@/lib/desktop/is-desktop"

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const FORMAT_LABEL: Record<ImportFormat, string> = {
    postman: "Postman Collection v2.1",
    "postman-env": "Postman Environment",
    har: "HAR (HTTP Archive)",
    openapi: "OpenAPI 3.x / Swagger 2.0",
    insomnia: "Insomnia export (v4 / v5)",
    bruno: "Bruno request (.bru / OpenCollection YAML)",
    curl: "cURL command — use the cURL importer instead",
    unknown: "Unknown / unsupported format",
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const { importCollection, openFolderCollection } = useCollectionsActions()
    const { addEnvironment, updateEnvironment } = useEnvironmentsActions()
    const tf = useTranslations("ApiClient.fileSync")
    const [text, setText] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    // isDesktop() is false during SSR — gate behind a mounted flag to avoid hydration mismatch.
    const [desktop, setDesktop] = React.useState(false)
    React.useEffect(() => { setDesktop(isDesktop()) }, [])

    /** "Open folder" live-links a Bruno folder; this keeps the old one-time import. */
    const importBrunoCopy = async () => {
        setBusy(true)
        try {
            if (await openFolderCollection("copy")) onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    const detected: ImportFormat = React.useMemo(() => detectImportFormat(text), [text])
    const canImport = detected !== "curl" && detected !== "unknown"

    const handleFile = async (file: File | null) => {
        if (!file) return
        const content = await file.text()
        setText(content)
    }

    const handleImport = async () => {
        if (!canImport) return
        setBusy(true)
        try {
            if (detected === "postman-env") {
                const env = importPostmanEnvironment(text)
                const envId = await addEnvironment(env.name)
                if (envId) await updateEnvironment(envId, { variables: env.variables })
                toast.success(`Imported environment "${env.name}" (${env.variables.length} variables)`)
                onOpenChange(false)
                setText("")
                return
            }
            // Insomnia and Bruno carry their own environments alongside the tree.
            let importedEnvironments: Array<{ name: string; variables: EnvironmentVariable[] }> = []
            let collection
            if (detected === "postman") {
                collection = importPostmanCollectionWithMeta(text).collection
            } else if (detected === "insomnia") {
                const result = importInsomniaWithMeta(text)
                collection = result.collection
                importedEnvironments = result.environments
            } else if (detected === "bruno") {
                // Pasting one .bru/.yml file — the folder importer handles a
                // single-entry list and names the collection after the request.
                const result = importBrunoFolder([{ path: "request.bru", text }])
                collection = result.collection
                importedEnvironments = result.environments
            } else {
                collection = detected === "har" ? importHar(text) : importOpenApiSpec(text)
            }
            // OpenAPI imports get auto-generated mock examples derived from the
            // spec's 2xx response schemas. Lets users hit the public mock route
            // immediately without crafting Save-as-Example entries by hand.
            if (detected === "openapi") {
                generateMockExamplesFromOpenApi(collection, text)
            }
            const created = await importCollection(collection)
            if (created) {
                for (const env of importedEnvironments) {
                    const envId = await addEnvironment(env.name)
                    if (envId) await updateEnvironment(envId, { variables: env.variables })
                }
                onOpenChange(false)
                setText("")
            }
        } catch (err) {
            toast.error(`Import failed: ${(err as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import collection</DialogTitle>
                    <DialogDescription>
                        Paste a Postman, Insomnia or Bruno export, an OpenAPI spec or a HAR file,
                        or pick one from disk. Format is auto-detected.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 flex-1 min-h-0">
                    <div className="flex items-center gap-2">
                        <label className="inline-flex">
                            <input
                                type="file"
                                accept=".json,.har,.yaml,.yml,.bru,application/json,application/x-yaml,text/yaml"
                                className="hidden"
                                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                            />
                            <Button type="button" variant="outline" size="sm" asChild>
                                <span>Choose file</span>
                            </Button>
                        </label>
                        {desktop && (
                            <Button type="button" variant="outline" size="sm" onClick={() => void importBrunoCopy()} disabled={busy}>
                                {tf("importBrunoCopy")}
                            </Button>
                        )}
                        <div className="text-xs text-muted-foreground">
                            Detected: <span className={
                                canImport ? "text-success font-semibold" : "text-muted-foreground"
                            }>
                                {FORMAT_LABEL[detected]}
                            </span>
                        </div>
                    </div>
                    <Textarea
                        className="flex-1 min-h-[300px] font-mono text-xs"
                        placeholder="Paste collection JSON here…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!canImport || busy}>
                        {busy ? "Importing…" : "Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
