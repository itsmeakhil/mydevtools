"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Import } from "lucide-react"
import { useTranslations } from "next-intl"

export type ImportCurlTarget = "new-tab" | "replace-current"

interface ImportCurlDialogProps {
    onImport: (curl: string, target: ImportCurlTarget) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ImportCurlDialog({ onImport, open: openProp, onOpenChange }: ImportCurlDialogProps) {
    const t = useTranslations("ApiClient.importCurl")
    const [openInternal, setOpenInternal] = React.useState(false)
    const open = openProp !== undefined ? openProp : openInternal
    const setOpen = onOpenChange ?? setOpenInternal
    const [curl, setCurl] = React.useState("")

    const handleImport = (target: ImportCurlTarget) => {
        if (curl.trim()) {
            onImport(curl, target)
            setOpen(false)
            setCurl("")
        }
    }

    const isControlled = openProp !== undefined

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Import className="h-4 w-4" />
                        {t("trigger")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogDescription")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder={t("placeholder")}
                        className="h-[200px] font-mono text-xs"
                        value={curl}
                        onChange={(e) => setCurl(e.target.value)}
                    />
                </div>
                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => handleImport("replace-current")} disabled={!curl.trim()}>
                        Replace current tab
                    </Button>
                    <Button onClick={() => handleImport("new-tab")} disabled={!curl.trim()}>
                        {t("import")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
