"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMasterKeyStore } from "@/store/master-key-store"

interface VaultLockedPlaceholderProps {
    appName: string
}

export function VaultLockedPlaceholder({ appName }: VaultLockedPlaceholderProps) {
    const { openVaultGate } = useMasterKeyStore()

    return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/60">
                    <Lock className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{appName} is locked</p>
                    <p className="text-xs text-muted-foreground max-w-[220px]">
                        This app stores sensitive data encrypted with your master password.
                    </p>
                </div>
                <Button size="sm" onClick={openVaultGate}>
                    Unlock vault
                </Button>
            </div>
        </div>
    )
}
