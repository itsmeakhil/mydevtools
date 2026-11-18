"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconKeyboard } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { SHORTCUTS, formatKeys, isMacPlatform } from "@/lib/api-client/shortcuts"

interface HelpShortcutsDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function HelpShortcutsDialog({ open, onOpenChange }: HelpShortcutsDialogProps = {}) {
    const t = useTranslations("ApiClient.shortcuts")
    const [isMac, setIsMac] = React.useState(false)

    React.useEffect(() => {
        setIsMac(isMacPlatform())
    }, [])

    const isControlled = open !== undefined

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("ariaLabel")} title={t("ariaLabel")}>
                        <IconKeyboard className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>
                <ul className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm pt-2">
                    {SHORTCUTS.map(({ id, keys }) => (
                        <li key={id} className="contents">
                            <span className="flex flex-wrap gap-1">
                                {keys.map((k) => (
                                    <kbd key={k} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                        {formatKeys(k, isMac)}
                                    </kbd>
                                ))}
                            </span>
                            <span className="self-center">{t(id)}</span>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    )
}
