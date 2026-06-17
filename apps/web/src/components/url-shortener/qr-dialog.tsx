'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Check,
    Copy,
    Loader2,
    QrCode,
} from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog'
import { useCopy } from './hooks/use-copy'

interface QrDialogProps {
    url: string
    open: boolean
    onClose: () => void
}

export function QrDialog({ url, open, onClose }: QrDialogProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null)
    const cachedUrl = useRef<string | null>(null)
    const { copied, copy } = useCopy()

    useEffect(() => {
        if (!open) return
        if (cachedUrl.current) {
            setDataUrl(cachedUrl.current)
            return
        }
        QRCode.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }).then((result) => {
            cachedUrl.current = result
            setDataUrl(result)
        }).catch(() => {})
    }, [open, url])

    const download = () => {
        if (!dataUrl) return
        const a = document.createElement('a')
        a.download = 'qr-code.png'
        a.href = dataUrl
        a.click()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm p-0 overflow-hidden">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-4">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <QrCode className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-semibold leading-none">QR Code</DialogTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Scan to open the short link</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 px-5 py-6">
                        <div className="relative flex items-center justify-center rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                            {dataUrl ? (
                                <img src={dataUrl} alt="QR code" width={240} height={240} className="block rounded-lg" />
                            ) : (
                                <div className="flex h-[240px] w-[240px] items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => copy(url, 'qr-url')}
                            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/70"
                        >
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</span>
                            {copied === 'qr-url' ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                        </button>
                    </div>

                    <div className="flex gap-2 border-t border-border/50 px-5 py-4">
                        <Button variant="outline" className="flex-1 gap-2" onClick={() => copy(url, 'qr-url')}>
                            {copied === 'qr-url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            Copy URL
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground hover:opacity-90"
                            onClick={download}
                            disabled={!dataUrl}
                        >
                            <QrCode className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
