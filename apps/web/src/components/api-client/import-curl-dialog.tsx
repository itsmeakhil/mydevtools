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

interface ImportCurlDialogProps {
    onImport: (curl: string) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ImportCurlDialog({ onImport, open: openProp, onOpenChange }: ImportCurlDialogProps) {
    const t = useTranslations("ApiClient.importCurl")
    const [openInternal, setOpenInternal] = React.useState(false)
    const open = openProp !== undefined ? openProp : openInternal
    const setOpen = onOpenChange ?? setOpenInternal
    const [curl, setCurl] = React.useState("")

    const handleImport = () => {
        if (curl.trim()) {
            onImport(curl)
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
                <DialogFooter>
                    <Button onClick={handleImport}>{t("import")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
