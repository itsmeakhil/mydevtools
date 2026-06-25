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
import { Cookie, Trash2 } from "lucide-react"
import { clearCookies, deleteCookie, listCookies, type StoredCookie } from "@/lib/cookie-jar"
import { toast } from "sonner"

interface CookieJarDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CookieJarDialog({ open, onOpenChange }: CookieJarDialogProps) {
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
        toast.success(`Cleared cookies for ${domain}`)
    }
    const handleClearAll = () => {
        clearCookies()
        setTick((n) => n + 1)
        toast.success("Cookie jar cleared")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" />
                        Cookie jar
                    </DialogTitle>
                    <DialogDescription>
                        Cookies stored client-side, attached to requests by matching domain + path.
                        Postman-style — bypasses the browser cookie store so HttpOnly cookies still work.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{cookies.length} cookie{cookies.length === 1 ? "" : "s"} across {groups.length} domain{groups.length === 1 ? "" : "s"}</span>
                    {cookies.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={handleClearAll}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
                        </Button>
                    )}
                </div>
                <ScrollArea className="flex-1 min-h-0 -mx-1">
                    <div className="px-1 space-y-4">
                        {groups.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                Jar is empty. Run a request that sets a cookie to populate.
                            </div>
                        )}
                        {groups.map(([domain, items]) => (
                            <div key={domain} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold">{domain}</span>
                                    <Button size="sm" variant="ghost" onClick={() => handleClearDomain(domain)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {items.map((c) => (
                                    <div key={`${c.name}-${c.path}`} className="flex items-start justify-between gap-2 text-xs border-t pt-2 first:border-t-0 first:pt-0">
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold">{c.name}</span>
                                                <span className="font-mono text-muted-foreground break-all">{c.value}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                                <span>Path: <code className="font-mono">{c.path}</code></span>
                                                {c.expires && <span>Expires: {new Date(c.expires).toLocaleString()}</span>}
                                                {c.sameSite && <span>SameSite: {c.sameSite}</span>}
                                                {c.httpOnly && <span className="text-amber-600 font-medium">HttpOnly</span>}
                                                {c.secure && <span className="text-emerald-600 font-medium">Secure</span>}
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c)}>
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
