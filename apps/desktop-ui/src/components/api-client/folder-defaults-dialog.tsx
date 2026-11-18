"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { KeyValueEditor } from "./key-value-editor"
import { AuthEditor } from "./auth-editor"
import type { Collection, CollectionFolder, KeyValueItem, RequestAuth } from "./types"

const CodeEditor = dynamic(() => import("@/components/ui/code-editor"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
})
const MemoCodeEditor = React.memo(CodeEditor)

/** What the dialog edits — a folder, or a whole collection (adds Variables). */
export type DefaultsTarget =
    | { kind: "folder"; item: CollectionFolder }
    | { kind: "collection"; item: Collection }

export type DefaultsPatch = Pick<Collection, "defaultHeaders" | "defaultAuth" | "preRequestScript" | "testScript" | "variables">

interface FolderDefaultsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    target: DefaultsTarget | null
    onSave: (patch: DefaultsPatch) => void
}

const emptyRow = (): KeyValueItem => ({ id: crypto.randomUUID(), key: "", value: "", active: true })
const withRow = (rows: KeyValueItem[] | undefined) => (rows && rows.length > 0 ? rows : [emptyRow()])
const filled = (rows: KeyValueItem[]) => rows.filter((r) => r.key || r.value)

export function FolderDefaultsDialog({ open, onOpenChange, target, onSave }: FolderDefaultsDialogProps) {
    const t = useTranslations("ApiClient.collectionDefaults")
    const [headers, setHeaders] = React.useState<KeyValueItem[]>([])
    const [variables, setVariables] = React.useState<KeyValueItem[]>([])
    const [auth, setAuth] = React.useState<RequestAuth>({ type: "none" })
    const [pre, setPre] = React.useState("")
    const [test, setTest] = React.useState("")
    const isCollection = target?.kind === "collection"

    React.useEffect(() => {
        if (!target) return
        const item = target.item
        setHeaders(withRow(item.defaultHeaders))
        setVariables(withRow(target.kind === "collection" ? target.item.variables : undefined))
        setAuth(item.defaultAuth ?? { type: "none" })
        setPre(item.preRequestScript ?? "")
        setTest(item.testScript ?? "")
    }, [target])

    // Empty values (not undefined) so a backend merge-patch actually clears them.
    const handleSave = () => {
        onSave({
            defaultHeaders: filled(headers),
            defaultAuth: auth,
            preRequestScript: pre.trim() ? pre : "",
            testScript: test.trim() ? test : "",
            ...(isCollection && { variables: filled(variables) }),
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {t(isCollection ? "collectionTitle" : "folderTitle", { name: target?.item.name ?? "—" })}
                    </DialogTitle>
                    <DialogDescription>{t(isCollection ? "collectionDescription" : "folderDescription")}</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={isCollection ? "variables" : "headers"} key={target?.item.id} className="flex-1 flex flex-col min-h-0">
                    <TabsList>
                        {isCollection && <TabsTrigger value="variables">{t("tabVariables")}</TabsTrigger>}
                        <TabsTrigger value="headers">{t("tabHeaders")}</TabsTrigger>
                        <TabsTrigger value="auth">{t("tabAuth")}</TabsTrigger>
                        <TabsTrigger value="pre-request">{t("tabPreRequest")}</TabsTrigger>
                        <TabsTrigger value="tests">{t("tabTests")}</TabsTrigger>
                    </TabsList>
                    {isCollection && (
                        <TabsContent value="variables" className="flex-1 min-h-0 mt-2 overflow-auto space-y-2">
                            <p className="text-xs text-muted-foreground">{t("variablesHint")}</p>
                            <KeyValueEditor items={variables} onChange={setVariables} />
                        </TabsContent>
                    )}
                    <TabsContent value="headers" className="flex-1 min-h-0 mt-2 overflow-auto">
                        <KeyValueEditor items={headers} onChange={setHeaders} />
                    </TabsContent>
                    <TabsContent value="auth" className="flex-1 min-h-0 mt-2 overflow-auto space-y-5">
                        <AuthEditor auth={auth} setAuth={setAuth} />
                    </TabsContent>
                    <TabsContent value="pre-request" className="flex-1 min-h-0 mt-2">
                        <div className="h-full min-h-[260px] border rounded-lg overflow-hidden">
                            <MemoCodeEditor value={pre} onChange={setPre} language="javascript" />
                        </div>
                    </TabsContent>
                    <TabsContent value="tests" className="flex-1 min-h-0 mt-2">
                        <div className="h-full min-h-[260px] border rounded-lg overflow-hidden">
                            <MemoCodeEditor value={test} onChange={setTest} language="javascript" />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
