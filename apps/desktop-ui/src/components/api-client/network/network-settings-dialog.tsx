"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getUserPreferences, patchUserPreferences } from "@/lib/user-preferences-api"
import { invalidateGlobalNetwork, type ClientCertEntry } from "@/lib/api-client/network-settings"
import { CertListEditor, cleanCerts, cleanPaths } from "./cert-list-editor"

interface NetworkSettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Global client certificates + CA files, stored in the encrypted preferences. */
export function NetworkSettingsDialog({ open, onOpenChange }: NetworkSettingsDialogProps) {
    const t = useTranslations("ApiClient.network")
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
                setCerts(p.apiClientNetwork?.certs ?? [])
                setCaPaths(p.apiClientNetwork?.caPaths ?? [])
            })
            .catch(() => { /* show empty settings; save will report a failure */ })
            .finally(() => { if (!cancelled) setLoaded(true) })
        return () => { cancelled = true }
    }, [open])

    const handleSave = async () => {
        setSaving(true)
        try {
            const prev = (await getUserPreferences()).apiClientNetwork
            await patchUserPreferences({ apiClientNetwork: { ...prev, certs: cleanCerts(certs), caPaths: cleanPaths(caPaths) } })
            invalidateGlobalNetwork()
            toast.success(t("saved"))
            onOpenChange(false)
        } catch (e) {
            toast.error(`${t("saveFailed")}: ${(e as Error).message}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-auto pr-1">
                    {loaded && <CertListEditor certs={certs} onCertsChange={setCerts} caPaths={caPaths} onCaPathsChange={setCaPaths} />}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={handleSave} disabled={!loaded || saving}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
