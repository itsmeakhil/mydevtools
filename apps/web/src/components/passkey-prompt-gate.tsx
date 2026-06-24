'use client'

import { useEffect, useRef, useState } from 'react'
import { Fingerprint, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'

import useAuth from '@/utils/useAuth'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { listPasskeys, registerPasskey } from '@/lib/passkey'

const DISMISS_KEY = 'mdt:passkey_prompt_dismissed'

export function PasskeyPromptGate() {
    const t = useTranslations('SettingsPage.passkeys.prompt')
    const { user, loading: authLoading } = useAuth(false)
    const [open, setOpen] = useState(false)
    const [registering, setRegistering] = useState(false)
    const mountedRef = useRef(true)
    useEffect(() => () => { mountedRef.current = false }, [])

    useEffect(() => {
        if (authLoading || !user) return
        if (typeof window === 'undefined') return
        if (window.localStorage.getItem(DISMISS_KEY) === '1') return
        if (!browserSupportsWebAuthn()) return

        let cancelled = false
        ;(async () => {
            try {
                const passkeys = await listPasskeys()
                if (!cancelled && passkeys.length === 0) setOpen(true)
            } catch {
                /* fail closed: don't nag if we can't even check */
            }
        })()
        return () => {
            cancelled = true
        }
    }, [user, authLoading])

    const dismiss = (persist: boolean) => {
        if (persist && typeof window !== 'undefined') {
            window.localStorage.setItem(DISMISS_KEY, '1')
        }
        setOpen(false)
    }

    const handleSetup = async () => {
        setRegistering(true)
        try {
            await registerPasskey()
            if (!mountedRef.current) return
            toast.success(t('successToast'))
            dismiss(true)
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('errorToast')
            // NotAllowedError = user cancelled in the OS prompt — keep prompt open
            if (!/NotAllowedError|cancel/i.test(msg)) {
                toast.error(msg)
            }
        } finally {
            if (mountedRef.current) setRegistering(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !registering && !o && dismiss(true)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5" />
                        {t('title')}
                    </DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => dismiss(true)} disabled={registering}>
                        {t('skip')}
                    </Button>
                    <Button onClick={handleSetup} disabled={registering}>
                        {registering ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('setup')}
                            </>
                        ) : (
                            t('setup')
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
