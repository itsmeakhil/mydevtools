"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"
import { invalidateGlobalNetwork, type ClientCertEntry, type ProxySettings } from "@/lib/api-client/network-settings"
import { CertListEditor, cleanCerts, cleanPaths } from "./cert-list-editor"

interface NetworkSettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Global proxy + client certificates + CA files, stored in the encrypted preferences. */
export function NetworkSettingsDialog({ open, onOpenChange }: NetworkSettingsDialogProps) {
    const t = useTranslations("ApiClient.network")
    const [proxy, setProxy] = React.useState<ProxySettings>({ mode: "system" })
    const [certs, setCerts] = React.useState<ClientCertEntry[]>([])
    const [caPaths, setCaPaths] = React.useState<string[]>([])
    const [loaded, setLoaded] = React.useState(false)
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        if (!open) return
        let cancelled = false
        setLoaded(false)
        getUserPreferences()
            .then((p) => {
                if (cancelled) return
                setProxy(p.apiClientNetwork?.proxy ?? { mode: "system" })
                setCerts(p.apiClientNetwork?.certs ?? [])
                setCaPaths(p.apiClientNetwork?.caPaths ?? [])
            })
            .catch(() => { /* show defaults; save will report a failure */ })
            .finally(() => { if (!cancelled) setLoaded(true) })
        return () => { cancelled = true }
    }, [open])

    const handleSave = async () => {
        setSaving(true)
        try {
            await patchUserPreferences({
                apiClientNetwork: {
                    proxy: {
                        mode: proxy.mode,
                        // Kept while switching modes so "manual" comes back filled in.
                        url: proxy.url?.trim() ?? "",
                        username: proxy.username?.trim() ?? "",
                        password: proxy.password ?? "",
                        bypass: proxy.bypass?.trim() ?? "",
                    },
                    certs: cleanCerts(certs),
                    caPaths: cleanPaths(caPaths),
                },
            })
            invalidateGlobalNetwork()
            toast.success(t("saved"))
            onOpenChange(false)
        } catch (e) {
            toast.error(`${t("saveFailed")}: ${(e as Error).message}`)
        } finally {
            setSaving(false)
        }
    }

    const set = (patch: Partial<ProxySettings>) => setProxy((p) => ({ ...p, ...patch }))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                {loaded && (
                    <Tabs defaultValue="proxy" className="flex-1 flex flex-col min-h-0">
                        <TabsList>
                            <TabsTrigger value="proxy">{t("tabProxy")}</TabsTrigger>
                            <TabsTrigger value="certificates">{t("tabCertificates")}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="proxy" className="flex-1 min-h-0 mt-3 overflow-auto space-y-4 pr-1">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t("proxyMode")}</Label>
                                <Select value={proxy.mode} onValueChange={(v) => set({ mode: v as ProxySettings["mode"] })}>
                                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system">{t("modeSystem")}</SelectItem>
                                        <SelectItem value="manual">{t("modeManual")}</SelectItem>
                                        <SelectItem value="off">{t("modeOff")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{t("proxyLocalHint")}</p>
                            </div>
                            {proxy.mode === "manual" && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="proxy-url" className="text-xs">{t("proxyUrl")}</Label>
                                        <Input
                                            id="proxy-url"
                                            value={proxy.url ?? ""}
                                            onChange={(e) => set({ url: e.target.value })}
                                            placeholder={t("proxyUrlPlaceholder")}
                                            spellCheck={false}
                                            className="h-8 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="proxy-user" className="text-xs">{t("proxyUsername")}</Label>
                                            <Input id="proxy-user" value={proxy.username ?? ""} onChange={(e) => set({ username: e.target.value })} autoComplete="off" className="h-8 text-xs" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="proxy-pass" className="text-xs">{t("proxyPassword")}</Label>
                                            <Input id="proxy-pass" type="password" value={proxy.password ?? ""} onChange={(e) => set({ password: e.target.value })} autoComplete="off" className="h-8 text-xs" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="proxy-bypass" className="text-xs">{t("proxyBypass")}</Label>
                                        <Textarea
                                            id="proxy-bypass"
                                            value={proxy.bypass ?? ""}
                                            onChange={(e) => set({ bypass: e.target.value })}
                                            placeholder={t("proxyBypassPlaceholder")}
                                            spellCheck={false}
                                            rows={2}
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                </>
                            )}
                        </TabsContent>
                        <TabsContent value="certificates" className="flex-1 min-h-0 mt-3 overflow-auto pr-1">
                            <CertListEditor certs={certs} onCertsChange={setCerts} caPaths={caPaths} onCaPathsChange={setCaPaths} />
                        </TabsContent>
                    </Tabs>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={handleSave} disabled={!loaded || saving}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
