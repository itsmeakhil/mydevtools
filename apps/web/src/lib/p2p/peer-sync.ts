/**
 * P2P collection sync over WebRTC data channels.
 *
 * Trust model: out-of-band signalling (user copies offer/answer between peers
 * over Slack / chat / whatever). Once the channel opens, traffic is encrypted
 * end-to-end by DTLS — no server sees collection contents.
 *
 * Lazy v1 — manual signalling, no STUN/TURN. Both peers must be on the same
 * NAT'd network OR the requesting peer has a public IP. Phase 4 follow-up
 * can wire in a STUN server.
 */

export interface PeerSyncOptions {
    onOpen?: () => void
    onClose?: () => void
    onMessage?: (msg: unknown) => void
    onError?: (err: Error) => void
}

export interface PeerSyncHandle {
    pc: RTCPeerConnection
    channel?: RTCDataChannel
    send: (data: unknown) => void
    close: () => void
}

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

/** Initiator side: create offer, wait for ICE gathering, return SDP. */
export async function createOffer(opts: PeerSyncOptions = {}): Promise<{ handle: PeerSyncHandle; offer: string }> {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    const channel = pc.createDataChannel("mdt-sync")
    wireChannel(channel, opts)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await waitForIceGathering(pc)
    return {
        handle: makeHandle(pc, channel),
        offer: JSON.stringify(pc.localDescription),
    }
}

/** Receiver side: accept SDP offer, return SDP answer to ship back. */
export async function acceptOffer(offer: string, opts: PeerSyncOptions = {}): Promise<{ handle: PeerSyncHandle; answer: string }> {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    let channel: RTCDataChannel | undefined
    pc.ondatachannel = (ev) => {
        channel = ev.channel
        wireChannel(channel, opts)
    }
    await pc.setRemoteDescription(JSON.parse(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await waitForIceGathering(pc)
    const handle = makeHandle(pc, channel)
    return { handle, answer: JSON.stringify(pc.localDescription) }
}

/** Initiator: feed the answer back, channel opens on both ends. */
export async function applyAnswer(handle: PeerSyncHandle, answer: string): Promise<void> {
    await handle.pc.setRemoteDescription(JSON.parse(answer))
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === "complete") return Promise.resolve()
    return new Promise((resolve) => {
        const check = () => {
            if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", check)
                resolve()
            }
        }
        pc.addEventListener("icegatheringstatechange", check)
        // Hard cap so a stalled gather doesn't hang the UI.
        setTimeout(() => resolve(), 4_000)
    })
}

function wireChannel(channel: RTCDataChannel, opts: PeerSyncOptions): void {
    channel.onopen = () => opts.onOpen?.()
    channel.onclose = () => opts.onClose?.()
    channel.onerror = () => opts.onError?.(new Error("DataChannel error"))
    channel.onmessage = (ev) => {
        try {
            opts.onMessage?.(JSON.parse(String(ev.data)))
        } catch {
            opts.onMessage?.(ev.data)
        }
    }
}

function makeHandle(pc: RTCPeerConnection, channel?: RTCDataChannel): PeerSyncHandle {
    return {
        pc,
        channel,
        send(data: unknown) {
            const ch = channel
            if (!ch || ch.readyState !== "open") throw new Error("Channel not open")
            ch.send(typeof data === "string" ? data : JSON.stringify(data))
        },
        close() {
            try { channel?.close() } catch { /* noop */ }
            try { pc.close() } catch { /* noop */ }
        },
    }
}
