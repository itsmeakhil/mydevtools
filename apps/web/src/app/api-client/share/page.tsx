"use client"

import * as React from "react"
import Link from "next/link"
import { decodeCollectionShareFragment } from "@/lib/share-link"
import { exportPostmanCollection, downloadCollectionAsPostman } from "@/lib/export/postman"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, FileDown, ArrowRight, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

function methodColor(method: string): string {
    switch (method) {
        case "GET": return "text-sky-500"
        case "POST": return "text-emerald-500"
        case "PUT": return "text-amber-500"
        case "DELETE": return "text-rose-500"
        case "PATCH": return "text-yellow-500"
        default: return "text-muted-foreground"
    }
}

function RequestRow({ req }: { req: CollectionRequest }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
            <span className={cn("text-[10px] font-black uppercase w-14 tracking-tighter shrink-0", methodColor(req.method))}>
                {req.method}
            </span>
            <span className="text-sm font-medium truncate flex-1 min-w-0">{req.name}</span>
            <span className="text-xs font-mono text-muted-foreground truncate min-w-0">{req.url}</span>
        </div>
    )
}

function ItemsList({ items, level = 0 }: { items: Array<CollectionFolder | CollectionRequest>; level?: number }) {
    return (
        <div className="space-y-1.5" style={{ paddingLeft: `${level * 12}px` }}>
            {items.map((item) => {
                if ("type" in item && item.type === "folder") {
                    return (
                        <details key={item.id} className="space-y-1.5" open>
                            <summary className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                <Folder className="h-3.5 w-3.5" />
                                {item.name}
                                <span className="text-[10px] font-mono opacity-60">({item.items.length})</span>
                            </summary>
                            <ItemsList items={item.items} level={level + 1} />
                        </details>
                    )
                }
                return <RequestRow key={item.id} req={item as CollectionRequest} />
            })}
        </div>
    )
}

export default function ShareViewPage() {
    const [collection, setCollection] = React.useState<Collection | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const fragment = (window.location.hash || "").replace(/^#/, "")
        if (!fragment) {
            setError("No share payload in URL fragment")
            return
        }
        decodeCollectionShareFragment(fragment)
            .then(setCollection)
            .catch((e) => setError((e as Error).message))
    }, [])

    const count = React.useMemo(() => {
        if (!collection) return 0
        const walk = (items: Array<CollectionFolder | CollectionRequest>): number =>
            items.reduce((n, it) => n + ("type" in it && it.type === "folder" ? walk(it.items) : 1), 0)
        return walk(collection.items)
    }, [collection])

    const handleCopyPostman = async () => {
        if (!collection) return
        try {
            await navigator.clipboard.writeText(exportPostmanCollection(collection))
        } catch { /* noop */ }
    }

    return (
        <main className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-baseline justify-between">
                    <h1 className="text-2xl font-bold">Shared collection</h1>
                    <Link href="/app/api-client" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        Open API client <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                {error && (
                    <Card className="p-6 border-rose-500/30 bg-rose-500/[0.03]">
                        <div className="flex items-center gap-3 text-rose-500">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                                <div className="font-bold">Could not load share</div>
                                <div className="text-xs">{error}</div>
                            </div>
                        </div>
                    </Card>
                )}

                {collection && (
                    <>
                        <Card className="p-4 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-lg font-bold">{collection.name}</div>
                                <div className="text-xs text-muted-foreground">{count} request{count === 1 ? "" : "s"}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => downloadCollectionAsPostman(collection)}>
                                    <FileDown className="h-4 w-4 mr-1.5" /> Download (Postman v2.1)
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCopyPostman}>
                                    Copy JSON
                                </Button>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <ScrollArea className="max-h-[60vh]">
                                <ItemsList items={collection.items} />
                            </ScrollArea>
                        </Card>

                        <p className="text-[11px] text-muted-foreground text-center">
                            Snapshot stored in the URL fragment — nothing reaches the server.
                            Editing this view will not modify the original.
                        </p>
                    </>
                )}
            </div>
        </main>
    )
}
