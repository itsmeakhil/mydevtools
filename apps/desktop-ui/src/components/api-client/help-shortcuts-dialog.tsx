"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconKeyboard } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

// Browser tab shortcuts (Cmd/Ctrl+T, Cmd/Ctrl+W) cannot be intercepted in a web app —
// we use Alt+T and Alt+W instead. Cmd/Ctrl+Enter is form-safe and still works.
const SHORTCUTS: Array<[string, string]> = [
    ["Alt+T", "newTab"],
    ["Alt+W", "closeTab"],
    ["mod+Enter", "sendRequest"],
]

interface HelpShortcutsDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function HelpShortcutsDialog({ open, onOpenChange }: HelpShortcutsDialogProps = {}) {
    const t = useTranslations("ApiClient.shortcuts")
    const [isMac, setIsMac] = React.useState(false)

    React.useEffect(() => {
        setIsMac(/Mac|iPhone|iPad/i.test(navigator.userAgent))
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
                    {SHORTCUTS.map(([keys, labelKey]) => (
                        <React.Fragment key={keys}>
                            <li className="contents">
                                <kbd className="font-mono rounded bg-muted px-1.5 py-0.5 text-xs">
                                    {keys
                                        .replace("mod", isMac ? "⌘" : "Ctrl")
                                        .replace("Alt", isMac ? "⌥" : "Alt")}
                                </kbd>
                                <span className="self-center">{t(labelKey as "newTab" | "closeTab" | "sendRequest")}</span>
                            </li>
                        </React.Fragment>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    )
}
