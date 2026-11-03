"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Lock, FileUp, FileDown, MoreVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useTranslations } from "next-intl"

interface FloatingActionMenuProps {
    onLock: () => void
    onImportExport: () => void
    onAdd?: () => void
}

export function FloatingActionMenu({ onLock, onImportExport, onAdd }: FloatingActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const isMobile = useIsMobile()
    const t = useTranslations("PasswordManager.floatingMenu")

    if (!isMobile) return null

    const toggleMenu = () => setIsOpen(!isOpen)

    const menuItems = [
        {
            icon: Lock,
            label: t("lockVault"),
            onClick: () => {
                onLock()
                setIsOpen(false)
            },
            color: "text-muted-foreground",
            delay: 0.1
        },
        {
            icon: FileUp,
            label: t("importExport"),
            onClick: () => {
                onImportExport()
                setIsOpen(false)
            },
            color: "text-muted-foreground",
            delay: 0.05
        }
    ]

    if (onAdd) {
        menuItems.unshift({
            icon: Plus,
            label: t("addPassword"),
            onClick: () => {
                onAdd()
                setIsOpen(false)
            },
            color: "text-primary",
            delay: 0
        })
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 scrim z-40"
                    />
                )}
            </AnimatePresence>

            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {menuItems.map((item, index) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                    transition={{ delay: item.delay }}
                                    className="flex items-center gap-3"
                                >
                                    <span className="text-sm font-medium glass px-3 py-1.5 rounded-lg shadow-elev-3">
                                        {item.label}
                                    </span>
                                    <Button
                                        size="icon"
                                        className="h-12 w-12 rounded-full shadow-elev-3"
                                        variant="outline"
                                        onClick={item.onClick}
                                    >
                                        <item.icon className={cn("h-5 w-5", item.color)} />
                                    </Button>
                                </motion.div>
                            ))}
                        </>
                    )}
                </AnimatePresence>

                <Button
                    size="icon"
                    className={cn(
                        "h-14 w-14 rounded-full shadow-elev-3 transition-transform duration-200",
                        isOpen ? "rotate-90 bg-muted text-foreground hover:bg-muted" : "bg-primary text-primary-foreground"
                    )}
                    onClick={toggleMenu}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <MoreVertical className="h-6 w-6" />}
                </Button>
            </div>
        </>
    )
}
