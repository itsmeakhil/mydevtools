"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Cookie, Download, Trash2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import {
    clearCookies,
    deleteCookie,
    exportJar,
    importCookies,
    listCookies,
    parseCookieFile,
    toNetscapeCookies,
    type StoredCookie,
} from "@/lib/cookie-jar"
import { downloadFile } from "@/lib/desktop/save-file"
import { toast } from "sonner"

interface CookieJarDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CookieJarDialog({ open, onOpenChange }: CookieJarDialogProps) {
    const t = useTranslations("ApiClient.cookieJar")
    const fileRef = React.useRef<HTMLInputElement>(null)
    const [cookies, setCookies] = React.useState<StoredCookie[]>([])
    const [tick, setTick] = React.useState(0)

    React.useEffect(() => {
        if (!open) return
        setCookies(listCookies())
    }, [open, tick])

    const groups = React.useMemo(() => {
        const m = new Map<string, StoredCookie[]>()
        for (const c of cookies) {
            const arr = m.get(c.domain) ?? []
            arr.push(c)
            m.set(c.domain, arr)
        }
        return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
    }, [cookies])

    const handleDelete = (c: StoredCookie) => {
        deleteCookie(c.name, c.domain, c.path)
        setTick((n) => n + 1)
    }
    const handleClearDomain = (domain: string) => {
        clearCookies(domain)
        setTick((n) => n + 1)
        toast.success(t("clearedDomain", { domain }))
    }
    const handleClearAll = () => {
        clearCookies()
        setTick((n) => n + 1)
        toast.success(t("cleared"))
    }
    const handleImport = async (file: File | undefined) => {
        if (!file) return
        try {
            const n = importCookies(parseCookieFile(await file.text()))
            if (n === 0) toast.error(t("importEmpty"))
            else toast.success(t("imported", { count: n }))
        } catch (e) {
            toast.error(t("importFailed", { message: e instanceof Error ? e.message : String(e) }))
        }
        setTick((n) => n + 1)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" />
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("summary", { cookies: cookies.length, domains: groups.length })}</span>
                    <div className="flex items-center gap-1">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".txt,.json,text/plain,application/json"
                            className="hidden"
                            onChange={(e) => { void handleImport(e.target.files?.[0]); e.target.value = "" }}
                        />
                        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                            <Upload className="h-3.5 w-3.5 mr-1" /> {t("import")}
                        </Button>
                        {cookies.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                        <Download className="h-3.5 w-3.5 mr-1" /> {t("export")}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => downloadFile(JSON.stringify(exportJar(), null, 2), "cookies.json", "application/json")}>
                                        {t("exportJson")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadFile(toNetscapeCookies(exportJar()), "cookies.txt", "text/plain")}>
                                        {t("exportNetscape")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {cookies.length > 0 && (
                            <Button size="sm" variant="ghost" onClick={handleClearAll}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("clearAll")}
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 -mx-1">
                    <div className="px-1 space-y-4">
                        {groups.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-[13px]">
                                {t("empty")}
                            </div>
                        )}
                        {groups.map(([domain, items]) => (
                            <div key={domain} className="border border-border rounded-xl bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-semibold">{domain}</span>
                                    <Button size="sm" variant="ghost" aria-label={t("clearDomainLabel", { domain })} onClick={() => handleClearDomain(domain)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {items.map((c) => (
                                    <div key={`${c.name}-${c.path}`} className="flex items-start justify-between gap-2 text-xs border-t border-border pt-2 first:border-t-0 first:pt-0">
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-semibold">{c.name}</span>
                                                <span className="font-mono text-muted-foreground break-all">{c.value}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                                <span>{t("path")}: <code className="font-mono">{c.path}</code></span>
                                                {c.expires && <span>{t("expires")}: {new Date(c.expires).toLocaleString()}</span>}
                                                {c.sameSite && <span>SameSite: {c.sameSite}</span>}
                                                {c.httpOnly && <span className="text-warning font-medium">HttpOnly</span>}
                                                {c.secure && <span className="text-success font-medium">Secure</span>}
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("deleteLabel", { name: c.name })} onClick={() => handleDelete(c)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
