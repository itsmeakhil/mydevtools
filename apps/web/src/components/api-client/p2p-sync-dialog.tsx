"use client"

import * as React from "react"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createOffer, acceptOffer, applyAnswer, type PeerSyncHandle } from "@/lib/p2p/peer-sync"
import { useCollectionsState, useCollectionsActions } from "./context/collections-context"
import type { Collection } from "./types"
import { toast } from "sonner"

interface P2pSyncDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function P2pSyncDialog({ open, onOpenChange }: P2pSyncDialogProps) {
    const { collections } = useCollectionsState()
    const { importCollection } = useCollectionsActions()
    const [mode, setMode] = React.useState<"offer" | "accept">("offer")
    const [offerSdp, setOfferSdp] = React.useState("")
    const [answerSdp, setAnswerSdp] = React.useState("")
    const [handleRef, setHandleRef] = React.useState<PeerSyncHandle | null>(null)
    const [status, setStatus] = React.useState("idle")

    React.useEffect(() => () => handleRef?.close(), [handleRef])

    const startAsOfferer = async () => {
        setStatus("creating offer…")
        const { handle, offer } = await createOffer({
            onOpen: () => {
                setStatus("connected — sending collections")
                try { handle.send({ kind: "collections", payload: collections }) }
                catch (e) { toast.error((e as Error).message) }
            },
            onMessage: async (msg) => {
                const data = msg as { kind?: string; payload?: Collection[] }
                if (data?.kind === "collections" && Array.isArray(data.payload)) {
                    let imported = 0
                    for (const c of data.payload) {
                        const out = await importCollection(c)
                        if (out) imported++
                    }
                    toast.success(`Imported ${imported} peer collections`)
                }
            },
            onClose: () => setStatus("disconnected"),
        })
        setHandleRef(handle)
        setOfferSdp(offer)
        setStatus("share the offer SDP with peer; paste their answer below")
    }

    const acceptAsReceiver = async () => {
        if (!offerSdp.trim()) return
        setStatus("accepting offer…")
        const { handle, answer } = await acceptOffer(offerSdp, {
            onOpen: () => {
                setStatus("connected — sending collections")
                try { handle.send({ kind: "collections", payload: collections }) }
                catch (e) { toast.error((e as Error).message) }
            },
            onMessage: async (msg) => {
                const data = msg as { kind?: string; payload?: Collection[] }
                if (data?.kind === "collections" && Array.isArray(data.payload)) {
                    let imported = 0
                    for (const c of data.payload) {
                        const out = await importCollection(c)
                        if (out) imported++
                    }
                    toast.success(`Imported ${imported} peer collections`)
                }
            },
            onClose: () => setStatus("disconnected"),
        })
        setHandleRef(handle)
        setAnswerSdp(answer)
        setStatus("share the answer SDP back to the offerer")
    }

    const applyPeerAnswer = async () => {
        if (!handleRef || !answerSdp.trim()) return
        await applyAnswer(handleRef, answerSdp)
        setStatus("waiting for channel to open…")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Peer sync (WebRTC)</DialogTitle>
                    <DialogDescription>
                        Direct E2E-encrypted swap of collections between two clients. Out-of-band signalling —
                        copy/paste the SDP blobs over any side channel.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Button variant={mode === "offer" ? "default" : "outline"} size="sm" onClick={() => setMode("offer")}>
                        I&apos;m the offerer
                    </Button>
                    <Button variant={mode === "accept" ? "default" : "outline"} size="sm" onClick={() => setMode("accept")}>
                        I&apos;m the receiver
                    </Button>
                    <span className="text-xs text-muted-foreground ml-auto self-center">{status}</span>
                </div>
                {mode === "offer" ? (
                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                        <Button onClick={startAsOfferer} disabled={!!offerSdp}>1. Generate offer</Button>
                        {offerSdp && (
                            <>
                                <Label className="text-xs">Offer SDP — copy to peer</Label>
                                <Textarea value={offerSdp} readOnly className="font-mono text-[10px] flex-1 min-h-[80px]" />
                                <Label className="text-xs">Peer&apos;s answer SDP</Label>
                                <Textarea value={answerSdp} onChange={(e) => setAnswerSdp(e.target.value)} className="font-mono text-[10px] flex-1 min-h-[80px]" />
                                <Button onClick={applyPeerAnswer} disabled={!answerSdp.trim()}>2. Apply answer</Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                        <Label className="text-xs">Paste peer&apos;s offer SDP</Label>
                        <Textarea value={offerSdp} onChange={(e) => setOfferSdp(e.target.value)} className="font-mono text-[10px] flex-1 min-h-[80px]" />
                        <Button onClick={acceptAsReceiver} disabled={!offerSdp.trim() || !!answerSdp}>1. Accept + generate answer</Button>
                        {answerSdp && (
                            <>
                                <Label className="text-xs">Answer SDP — copy back to offerer</Label>
                                <Textarea value={answerSdp} readOnly className="font-mono text-[10px] flex-1 min-h-[80px]" />
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
