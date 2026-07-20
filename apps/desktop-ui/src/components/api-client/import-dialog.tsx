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
import { generateMockExamplesFromOpenApi } from "@/lib/mocks/openapi-mock-gen"
import { useCollectionsActions } from "./context/collections-context"
import { useEnvironmentsActions } from "./context/environments-context"
import { toast } from "sonner"

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const FORMAT_LABEL: Record<ImportFormat, string> = {
    postman: "Postman Collection v2.1",
    har: "HAR (HTTP Archive)",
    openapi: "OpenAPI 3.x / Swagger 2.0",
    curl: "cURL command — use the cURL importer instead",
    unknown: "Unknown / unsupported format",
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const { importCollection } = useCollectionsActions()
    const { addEnvironment, updateEnvironment } = useEnvironmentsActions()
    const [text, setText] = React.useState("")
    const [busy, setBusy] = React.useState(false)

    const detected: ImportFormat = React.useMemo(() => detectImportFormat(text), [text])
    const canImport = detected === "postman" || detected === "har" || detected === "openapi"

    const handleFile = async (file: File | null) => {
        if (!file) return
        const content = await file.text()
        setText(content)
    }

    const handleImport = async () => {
        if (!canImport) return
        setBusy(true)
        try {
            let postmanVariables: Array<{ key: string; value: string }> = []
            let collection
            if (detected === "postman") {
                const result = importPostmanCollectionWithMeta(text)
                collection = result.collection
                postmanVariables = result.variables
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
                // Postman collection-level variables → an api-client environment,
                // so {{baseUrl}}-style references resolve right after import.
                if (postmanVariables.length) {
                    const envId = await addEnvironment(collection.name)
                    if (envId) {
                        await updateEnvironment(envId, {
                            variables: postmanVariables.map((v) => ({
                                id: crypto.randomUUID(),
                                key: v.key,
                                value: v.value,
                                enabled: true,
                            })),
                        })
                    }
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
                        Paste a Postman v2.1 collection or HAR file, or pick one from disk.
                        Format is auto-detected.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 flex-1 min-h-0">
                    <div className="flex items-center gap-2">
                        <label className="inline-flex">
                            <input
                                type="file"
                                accept=".json,.har,.yaml,.yml,application/json,application/x-yaml,text/yaml"
                                className="hidden"
                                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                            />
                            <Button type="button" variant="outline" size="sm" asChild>
                                <span>Choose file</span>
                            </Button>
                        </label>
                        <div className="text-xs text-muted-foreground">
                            Detected: <span className={
                                canImport ? "text-emerald-600 font-semibold" : "text-muted-foreground"
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
