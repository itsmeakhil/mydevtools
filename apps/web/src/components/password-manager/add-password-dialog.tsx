"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Wand2, RefreshCw, Check, Copy, ChevronDown, ChevronUp } from "lucide-react"
import { usePasswordStore, PasswordEntry } from "@/store/password-store"
import { AdvancedGenerator } from "./advanced-generator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { encryptData } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { createPasswordEntry } from "@/lib/password-manager-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function AddPasswordDialog({ children }: { children?: React.ReactNode }) {
    const t = useTranslations("PasswordManager.form")
    const { encryptionKey, addPassword } = usePasswordStore()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        service: "",
        username: "",
        password: "",
        url: "",
        notes: "",
        tags: [] as string[]
    })
    const [tagInput, setTagInput] = useState("")
    const [showGenerator, setShowGenerator] = useState(false)
    const [strength, setStrength] = useState(0)

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

            const created = await createPasswordEntry({
                encryptedData: encrypted,
                iv,
                createdAt: timestamp,
                updatedAt: timestamp,
            })

            const newEntry: PasswordEntry = {
                id: created.id,
                ...formData,
                createdAt: timestamp,
                updatedAt: timestamp
            }

            addPassword(newEntry)
            setOpen(false)
            setFormData({ service: "", username: "", password: "", url: "", notes: "", tags: [] })
            setTagInput("")
            setShowGenerator(false)
            toast.success(t("toastSaved"))
        } catch (error) {
            console.error("Failed to add password:", error)
            toast.error(t("toastSaveFailed"))
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
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="service">{t("serviceName")}</Label>
                    <Input
                        id="service"
                        placeholder={t("placeholderService")}
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        required
                        autoFocus={!isMobile}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="username">{t("usernameEmail")}</Label>
                    <Input
                        id="username"
                        placeholder={t("placeholderUsername")}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative">
                    <Input
                        id="password"
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
                <Label htmlFor="url">{t("urlOptional")}</Label>
                <Input
                    id="url"
                    type="url"
                    placeholder={t("placeholderUrl")}
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">{t("notesOptional")}</Label>
                <Textarea
                    id="notes"
                    placeholder={t("placeholderNotes")}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tags">{t("tags")}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <span className="cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)}>×</span>
                        </Badge>
                    ))}
                </div>
                <Input
                    id="tags"
                    placeholder={t("placeholderTags")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {!isMobile && (
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={cn(isMobile && "w-full h-12 rounded-xl text-base")}>
                    {loading ? t("saving") : t("savePassword")}
                </Button>
            </div>
        </form>
    )

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    {children ? children : (
                        <Button
                            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-2xl z-50 p-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            size="icon"
                        >
                            <Plus className="h-7 w-7" />
                            <span className="sr-only">{t("addPasswordSrOnly")}</span>
                        </Button>
                    )}
                </DrawerTrigger>
                <DrawerContent className="max-h-[95vh]">
                    <div className="flex flex-col h-full max-h-[95vh]">
                        <DrawerHeader className="shrink-0 border-b pb-4">
                            <DrawerTitle className="text-xl">{t("addTitle")}</DrawerTitle>
                        </DrawerHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-8">
                            {FormContent}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        <Plus className="mr-2 h-4 w-4" /> {t("triggerAdd")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("addTitle")}</DialogTitle>
                </DialogHeader>
                {FormContent}
            </DialogContent>
        </Dialog>
    )
}

