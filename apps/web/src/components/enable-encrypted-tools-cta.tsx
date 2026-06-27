"use client"
import { useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useWorkspaceStore } from "@/store/workspace-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { useUserKeypairStore } from "@/store/user-keypair-store"
import {
  generateUserKeypair,
  generateWorkspaceDek,
  wrapDekForMember,
  dekFingerprint,
  unwrapUserPrivateKey,
} from "@/lib/workspace-crypto"
import { setKeypair, getKeypair } from "@/lib/user-keypair-api"
import { listMemberPublicKeys, rotateDek } from "@/lib/workspace-dek-api"

export function EnableEncryptedToolsCta({ workspaceId }: { workspaceId: string }) {
  const [working, setWorking] = useState(false)
  const masterKey = useMasterKeyStore((s) => s.encryptionKey)
  const masterVault = useMasterKeyStore((s) => s.vault)
  const userPub = useUserKeypairStore((s) => s.publicKey)
  const userPriv = useUserKeypairStore((s) => s.privateKey)
  const reloadStore = useWorkspaceStore((s) => s.loadFromBackend)

  async function handleEnable() {
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
      // 1. Ensure user has a keypair. If missing, generate + publish.
      let myPub = userPub
      let myPriv = userPriv
      if (!myPriv || !myPub) {
        const blob = await generateUserKeypair(masterKey)
        await setKeypair({
          publicKey: blob.publicKey,
          privateKeyEncrypted: blob.privateKeyEncrypted,
          salt: masterVault.salt,
          createdAt: Date.now(),
        })
        const fresh = await getKeypair()
        if (!fresh) throw new Error("Keypair publish failed")
        myPriv = await unwrapUserPrivateKey(masterKey, fresh.privateKeyEncrypted)
        useUserKeypairStore.getState().setKeypair(blob.publicKey, myPriv)
        myPub = blob.publicKey
      }
      // 2. Fetch member public keys.
      const members = await listMemberPublicKeys(workspaceId)
      const missing = members.filter((m) => !m.publicKey)
      if (missing.length > 0) {
        toast.warning(
          `${missing.length} member(s) haven't published a keypair yet. They'll receive a pending-wrap prompt on next login.`,
        )
      }
      const ready = members.filter((m) => m.publicKey)
      // 3. Generate workspace DEK.
      const dek = await generateWorkspaceDek()
      // 4. Wrap DEK for self + each ready member.
      const wraps = await Promise.all(
        ready.map(async (m) => {
          const wrapped = await wrapDekForMember(dek, myPriv!, m.publicKey!, myPub!)
          return { uid: m.uid, wrapped }
        }),
      )
      // 5. Submit to rotate-dek.
      const fp = await dekFingerprint(dek)
      await rotateDek(workspaceId, { dekFingerprint: fp, wraps })
      // 6. Reload workspace store (so settings.encryption shows in active workspace).
      await reloadStore()
      toast.success("Encryption enabled — encrypted tools are now available")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable encryption")
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button onClick={handleEnable} disabled={working}>
      {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
      Enable encrypted tools
    </Button>
  )
}
