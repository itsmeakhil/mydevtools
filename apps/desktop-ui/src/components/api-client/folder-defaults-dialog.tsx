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
import { KeyValueEditor } from "./key-value-editor"
import type { CollectionFolder, KeyValueItem } from "./types"

const CodeEditor = dynamic(() => import("@/components/ui/code-editor"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
})
const MemoCodeEditor = React.memo(CodeEditor)

interface FolderDefaultsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    folder: CollectionFolder | null
    onSave: (patch: Partial<CollectionFolder>) => void
}

export function FolderDefaultsDialog({ open, onOpenChange, folder, onSave }: FolderDefaultsDialogProps) {
    const [headers, setHeaders] = React.useState<KeyValueItem[]>([])
    const [pre, setPre] = React.useState("")
    const [test, setTest] = React.useState("")

    React.useEffect(() => {
        if (!folder) return
        setHeaders(
            folder.defaultHeaders && folder.defaultHeaders.length > 0
                ? folder.defaultHeaders
                : [{ id: crypto.randomUUID(), key: "", value: "", active: true }],
        )
        setPre(folder.preRequestScript ?? "")
        setTest(folder.testScript ?? "")
    }, [folder])

    const handleSave = () => {
        const cleanHeaders = headers.filter((h) => h.key || h.value)
        onSave({
            defaultHeaders: cleanHeaders,
            preRequestScript: pre.trim() ? pre : undefined,
            testScript: test.trim() ? test : undefined,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Folder defaults: {folder?.name ?? "—"}</DialogTitle>
                    <DialogDescription>
                        Headers / pre-request + test scripts here are merged into every request inside
                        this folder when it is loaded into a tab or run via the collection runner.
                        Request-level values win on conflict.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="headers" className="flex-1 flex flex-col min-h-0">
                    <TabsList>
                        <TabsTrigger value="headers">Headers</TabsTrigger>
                        <TabsTrigger value="pre-request">Pre-request</TabsTrigger>
                        <TabsTrigger value="tests">Tests</TabsTrigger>
                    </TabsList>
                    <TabsContent value="headers" className="flex-1 min-h-0 mt-2 overflow-auto">
                        <KeyValueEditor items={headers} onChange={setHeaders} />
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
