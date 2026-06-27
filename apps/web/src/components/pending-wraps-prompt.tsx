"use client"
import { useEffect, useState } from "react"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useUserKeypairStore } from "@/store/user-keypair-store"
import { useWorkspaceDekStore } from "@/store/workspace-dek-store"
import { unwrapUserPrivateKey, wrapDekForMember } from "@/lib/workspace-crypto"
import { getKeypair } from "@/lib/user-keypair-api"
import { listPendingWraps, postDekWrap, type MemberPublicKey } from "@/lib/workspace-dek-api"

export function PendingWrapsPrompt({ workspaceId }: { workspaceId: string }) {
  const [pending, setPending] = useState<MemberPublicKey[] | null>(null)
  const [working, setWorking] = useState(false)
  const masterKey = useMasterKeyStore((s) => s.encryptionKey)
  const masterVault = useMasterKeyStore((s) => s.vault)
  const userPub = useUserKeypairStore((s) => s.publicKey)
  const userPriv = useUserKeypairStore((s) => s.privateKey)

  useEffect(() => {
    let cancelled = false
    listPendingWraps(workspaceId).then((list) => {
      if (!cancelled) setPending(list)
    }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [workspaceId])

  if (!pending || pending.length === 0) return null

  async function handleCompleteWraps() {
    if (!masterKey) {
      toast.error("Unlock your master password first")
      return
    }
    if (!masterVault?.salt) {
      toast.error("Master vault not initialized")
      return
    }
    setWorking(true)
    try {
      // 1. Get this workspace's DEK (the current user must already have a wrap).
      const dek = await useWorkspaceDekStore.getState().getDek(workspaceId)
      if (!dek) {
        toast.error("You don't have access to this workspace's encryption key")
        return
      }
      // 2. Ensure current user has keypair (private key) loaded.
      let myPriv = userPriv
      let myPub = userPub
      if (!myPriv || !myPub) {
        const blob = await getKeypair()
        if (!blob) {
          toast.error("Generate your encryption keypair first")
          return
        }
        myPriv = await unwrapUserPrivateKey(masterKey, blob.privateKeyEncrypted)
        myPub = blob.publicKey
      }
      // 3. For each pending member with a publicKey, wrap DEK + POST.
      const ready = (pending ?? []).filter((m) => m.publicKey)
      for (const member of ready) {
        const wrapped = await wrapDekForMember(dek, myPriv!, member.publicKey!, myPub!)
        await postDekWrap(workspaceId, { target_uid: member.uid, wrapped })
      }
      // 4. Refresh pending list.
      const fresh = await listPendingWraps(workspaceId)
      setPending(fresh)
      toast.success(`Wrapped DEK for ${ready.length} member(s)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to wrap DEK")
    } finally {
      setWorking(false)
    }
  }

  const ready = pending.filter((m) => m.publicKey)
  const stillPending = pending.filter((m) => !m.publicKey)

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Pending encryption wraps</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {pending.length} member(s) need an encryption key wrap.
          {ready.length > 0 && ` ${ready.length} are ready to receive.`}
          {stillPending.length > 0 && ` ${stillPending.length} still need to publish their keypair.`}
        </p>
        {ready.length > 0 && (
          <Button onClick={handleCompleteWraps} disabled={working}>
            {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete wraps for {ready.length} member(s)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
