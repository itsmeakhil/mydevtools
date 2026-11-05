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
        <div className="flex items-center justify-center h-full p-6">
            <div className="flex w-full max-w-sm flex-col items-center gap-4 glass-overlay rounded-[20px] p-8 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/60" />
                <div className="space-y-1.5">
                    <p className="text-[15px] font-semibold text-foreground">{appName} is locked</p>
                    <p className="text-[13px] text-muted-foreground max-w-[240px]">
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
