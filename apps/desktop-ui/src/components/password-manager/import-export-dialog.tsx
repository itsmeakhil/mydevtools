"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, Download, FileJson, AlertTriangle } from "lucide-react"
import { usePasswordStore, PasswordEntry } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { createPasswordEntry } from "@/lib/password-manager-api"
import { encryptData } from "@/lib/encryption"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslations } from "next-intl"

interface ImportExportDialogProps {
    children?: React.ReactNode
}

export function ImportExportDialog({ children }: ImportExportDialogProps) {
    const t = useTranslations("PasswordManager.importExport")
    const tToast = useTranslations("PasswordManager.toasts")
    const pastePlaceholder = String(t.raw("pastePlaceholder"))
    const { encryptionKey } = useMasterKeyStore()
    const { passwords, addPassword } = usePasswordStore()
    const [open, setOpen] = useState(false)
    const [importData, setImportData] = useState("")
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        try {
            setImportData(await file.text())
        } catch {
            toast.error(t("toastImportFailed"))
        }
    }

    const handleExport = () => {
        try {
            const exportData = JSON.stringify(passwords.map(p => ({
                service: p.service,
                username: p.username,
                password: p.password,
                url: p.url,
                notes: p.notes,
                tags: p.tags
            })), null, 2)

            const blob = new Blob([exportData], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `password-vault-export-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success(t("toastExported"))
        } catch (error) {
            console.error("Export failed:", error)
            toast.error(t("toastExportFailed"))
        }
    }

    const handleImport = async () => {
        if (!importData.trim()) return
        if (!encryptionKey || !auth.currentUser) return

        setLoading(true)
        try {
            const parsed = JSON.parse(importData)
            if (!Array.isArray(parsed)) throw new Error("invalid_format")

            let successCount = 0

            for (const item of parsed) {
                if (!item.service || !item.username || !item.password) continue

                const timestamp = Date.now()
                const entryData = {
                    service: item.service,
                    username: item.username,
                    password: item.password,
                    url: item.url || "",
                    notes: item.notes || "",
                    tags: item.tags || []
                }

                const dataToEncrypt = JSON.stringify(entryData)
                const { encrypted, iv } = await encryptData(encryptionKey, dataToEncrypt)

                const created = await createPasswordEntry({
                    encryptedData: encrypted,
                    iv,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                })

                const newEntry: PasswordEntry = {
                    id: created.id,
                    ...entryData,
                    createdAt: timestamp,
                    updatedAt: timestamp
                }

                addPassword(newEntry)
                successCount++
            }

            toast.success(tToast("importedCount", { count: successCount }))
            setOpen(false)
            setImportData("")
        } catch (error) {
            console.error("Import failed:", error)
            toast.error(t("toastImportFailed"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2">
                        <FileJson className="h-4 w-4" /> {t("trigger")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="export" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="export">{t("tabExport")}</TabsTrigger>
                        <TabsTrigger value="import">{t("tabImport")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="export" className="space-y-4 py-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{t("warningTitle")}</AlertTitle>
                            <AlertDescription>
                                {t("warningBody")}
                            </AlertDescription>
                        </Alert>

                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/10">
                            <FileJson className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                                {t("exportBlurb")}
                            </p>
                            <Button onClick={handleExport} className="w-full max-w-xs">
                                <Download className="mr-2 h-4 w-4" /> {t("downloadJson")}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("pasteLabel")}</Label>
                            <Textarea
                                placeholder={pastePlaceholder}
                                className="h-[200px] font-mono text-xs"
                                value={importData}
                                onChange={(e) => setImportData(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("pasteHint")}
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                            <FileJson className="mr-2 h-4 w-4" /> {t("selectFile")}
                        </Button>
                        <DialogFooter>
                            <Button onClick={handleImport} disabled={loading || !importData}>
                                {loading ? t("importing") : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" /> {t("importPasswords")}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
