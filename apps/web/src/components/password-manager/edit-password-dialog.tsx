"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Wand2, ChevronDown, ChevronUp } from "lucide-react"
import { AdvancedGenerator } from "./advanced-generator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { usePasswordStore, PasswordEntry } from "@/store/password-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { encryptData } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { updatePasswordEntry } from "@/lib/password-manager-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface EditPasswordDialogProps {
    entry: PasswordEntry
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditPasswordDialog({ entry, open, onOpenChange }: EditPasswordDialogProps) {
    const t = useTranslations("PasswordManager.form")
    const { encryptionKey } = useMasterKeyStore()
    const { updatePassword } = usePasswordStore()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        service: entry.service,
        username: entry.username,
        password: entry.password,
        url: entry.url || "",
        notes: entry.notes || "",
        tags: entry.tags || [],
        totpSecret: entry.totpSecret || "",
    })
    const [tagInput, setTagInput] = useState("")
    const [showGenerator, setShowGenerator] = useState(false)
    const [strength, setStrength] = useState(0)

    useEffect(() => {
        setFormData({
            service: entry.service,
            username: entry.username,
            password: entry.password,
            url: entry.url || "",
            notes: entry.notes || "",
            tags: entry.tags || [],
            totpSecret: entry.totpSecret || "",
        })
    }, [entry])

    useEffect(() => {
        calculateStrength(formData.password)
    }, [formData.password])

    const calculateStrength = (pass: string) => {
        if (!pass) {
            setStrength(0)
            return
        }
        let score = 0
        if (pass.length >= 8) score += 1
        if (pass.length >= 12) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        setStrength(score)
    }

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const tag = tagInput.trim()
            if (tag && !formData.tags.includes(tag)) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
            }
            setTagInput("")
        }
    }

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!encryptionKey || !auth.currentUser) return

        setLoading(true)
        try {
            const dataToEncrypt = JSON.stringify(formData)
            const { encrypted, iv } = await encryptData(encryptionKey, dataToEncrypt)

            const timestamp = Date.now()

            await updatePasswordEntry(entry.id, {
                encryptedData: encrypted,
                iv,
                updatedAt: timestamp,
            })

            const updatedEntry: PasswordEntry = {
                id: entry.id,
                ...formData,
                createdAt: entry.createdAt,
                updatedAt: timestamp
            }

            updatePassword(updatedEntry)
            onOpenChange(false)
            toast.success(t("toastUpdated"))
        } catch (error) {
            console.error("Failed to update password:", error)
            toast.error(t("toastUpdateFailed"))
        } finally {
            setLoading(false)
        }
    }

    const getStrengthColor = (score: number) => {
        if (score === 0) return "bg-muted"
        if (score <= 2) return "bg-red-500"
        if (score <= 3) return "bg-yellow-500"
        return "bg-green-500"
    }

    const getStrengthLabel = (score: number) => {
        if (score === 0) return ""
        if (score <= 2) return t("strengthWeak")
        if (score <= 3) return t("strengthMedium")
        return t("strengthStrong")
    }

    const handlePasswordChange = useCallback((pass: string) => {
        setFormData(prev => ({ ...prev, password: pass }))
    }, [])

    const isMobile = useIsMobile()

    const FormContent = (
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-service">{t("serviceName")}</Label>
                    <Input
                        id="edit-service"
                        placeholder={t("placeholderService")}
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        required
                        autoFocus={!isMobile}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-username">{t("usernameEmail")}</Label>
                    <Input
                        id="edit-username"
                        placeholder={t("placeholderUsername")}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-password">{t("password")}</Label>
                <div className="relative">
                    <Input
                        id="edit-password"
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        className="font-mono"
                        placeholder={t("placeholderPassword")}
                    />
                </div>

                {formData.password && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("strength")}</span>
                            <span className={cn("font-medium",
                                strength <= 2 ? "text-red-500" :
                                    strength <= 3 ? "text-yellow-500" : "text-green-500"
                            )}>
                                {getStrengthLabel(strength)}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-300", getStrengthColor(strength))}
                                style={{ width: `${(strength / 5) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <Collapsible open={showGenerator} onOpenChange={setShowGenerator} className="border rounded-lg p-2 bg-muted/30">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-xs text-muted-foreground hover:text-primary">
                            <span className="flex items-center gap-2"><Wand2 className="h-3 w-3" /> {t("advancedGenerator")}</span>
                            {showGenerator ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                        <AdvancedGenerator
                            showInput={false}
                            onPasswordChange={handlePasswordChange}
                            className="p-2 bg-background rounded-md border shadow-sm"
                        />
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-url">{t("urlOptional")}</Label>
                <Input
                    id="edit-url"
                    type="url"
                    placeholder={t("placeholderUrl")}
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-totp-secret">2FA / TOTP Secret <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                    id="edit-totp-secret"
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={formData.totpSecret}
                    onChange={(e) => setFormData({ ...formData, totpSecret: e.target.value.replace(/\s/g, "").toUpperCase() })}
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                />
                <p className="text-[11px] text-muted-foreground">Paste the Base32 secret from the service&apos;s 2FA setup page. Stored encrypted.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-notes">{t("notesOptional")}</Label>
                <Textarea
                    id="edit-notes"
                    placeholder={t("placeholderNotes")}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-tags">{t("tags")}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <span className="cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)}>×</span>
                        </Badge>
                    ))}
                </div>
                <Input
                    id="edit-tags"
                    placeholder={t("placeholderTags")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {!isMobile && (
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={cn(isMobile && "w-full")}>
                    {loading ? t("updating") : t("updatePassword")}
                </Button>
            </div>
        </form>
    )

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <DrawerHeader>
                            <DrawerTitle>{t("editTitle")}</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-4">
                            {FormContent}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("editTitle")}</DialogTitle>
                </DialogHeader>
                {FormContent}
            </DialogContent>
        </Dialog >
    )
}
