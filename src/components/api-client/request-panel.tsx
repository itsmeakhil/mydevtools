"use client"

import * as React from "react"
import { Send, Loader2, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RequestMethod, Collection } from "./types"
import { SaveRequestDialog } from "./collections/save-request-dialog"
import { cn } from "@/lib/utils"

interface RequestPanelProps {
    method: RequestMethod
    setMethod: (method: RequestMethod) => void
    url: string
    setUrl: (url: string) => void
    onSend: () => void
    isLoading: boolean
    collections: Collection[]
    onSave: (parentId: string, name: string) => void
    saveDefaultName?: string
    onPaste: (text: string) => void
}

const METHODS: RequestMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

const getMethodColor = (method: string) => {
    switch (method) {
        case "GET": return "text-sky-500"
        case "POST": return "text-emerald-500"
        case "PUT": return "text-amber-500"
        case "DELETE": return "text-rose-500"
        case "PATCH": return "text-yellow-500"
        default: return "text-muted-foreground"
    }
}

const getMethodBg = (method: string) => {
    switch (method) {
        case "GET": return "bg-sky-500/10 border-sky-500/20"
        case "POST": return "bg-emerald-500/10 border-emerald-500/20"
        case "PUT": return "bg-amber-500/10 border-amber-500/20"
        case "DELETE": return "bg-rose-500/10 border-rose-500/20"
        case "PATCH": return "bg-yellow-500/10 border-yellow-500/20"
        default: return "bg-muted/50 border-border"
    }
}

export function RequestPanel({
    method,
    setMethod,
    url,
    setUrl,
    onSend,
    isLoading,
    collections,
    onSave,
    saveDefaultName,
    onPaste,
}: RequestPanelProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                <Select value={method} onValueChange={(v) => setMethod(v as RequestMethod)}>
                    <SelectTrigger className={cn(
                        "w-[110px] h-10 font-black tracking-tight transition-all border shrink-0",
                        getMethodBg(method),
                        getMethodColor(method)
                    )}>
                        <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                        {METHODS.map((m) => (
                            <SelectItem key={m} value={m} className={cn("font-bold", getMethodColor(m))}>
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 group">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="https://api.example.com/v1/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-10 pl-9 pr-10 font-mono text-xs bg-muted/30 border-muted group-hover:border-border transition-colors"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && url) {
                                onSend()
                            }
                        }}
                        onPaste={(e) => {
                            const text = e.clipboardData.getData("text")
                            if (text.trim().startsWith("curl ")) {
                                e.preventDefault()
                                onPaste(text)
                            }
                        }}
                    />
                    {url && (
                        <button
                            onClick={() => setUrl("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                <Button
                    onClick={onSend}
                    disabled={isLoading || !url}
                    className="h-10 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? "Sending..." : "Send"}
                </Button>

                <div className="border-l pl-2 flex items-center ml-1">
                    <SaveRequestDialog
                        collections={collections}
                        onSave={onSave}
                        defaultName={saveDefaultName}
                    />
                </div>
            </div>
        </div>
    )
}
