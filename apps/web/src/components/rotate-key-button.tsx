"use client"
import { useState } from "react"
import { Loader2, RotateCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useUserKeypairStore } from "@/store/user-keypair-store"
import { useWorkspaceDekStore } from "@/store/workspace-dek-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { generateWorkspaceDek, wrapDekForMember, dekFingerprint } from "@/lib/workspace-crypto"
import { listMemberPublicKeys, rotateDek } from "@/lib/workspace-dek-api"

export function RotateKeyButton({ workspaceId }: { workspaceId: string }) {
  const [working, setWorking] = useState(false)
  const userPriv = useUserKeypairStore((s) => s.privateKey)
  const userPub = useUserKeypairStore((s) => s.publicKey)
  const clearWsDek = useWorkspaceDekStore((s) => s.clearWorkspace)
  const reloadStore = useWorkspaceStore((s) => s.loadFromBackend)

  async function handleRotate() {
    if (!userPriv || !userPub) {
      toast.error("Generate your keypair first via Enable encrypted tools")
      return
    }
    setWorking(true)
    try {
      const members = await listMemberPublicKeys(workspaceId)
      const ready = members.filter((m) => m.publicKey)
      const missing = members.filter((m) => !m.publicKey)
      if (ready.length === 0) {
        toast.error("No members with published keypairs — cannot rotate")
        return
      }
      if (missing.length > 0) {
        toast.warning(
          `${missing.length} member(s) have no keypair and will lose access until they publish one`,
        )
      }
      const newDek = await generateWorkspaceDek()
      const wraps = await Promise.all(
        ready.map(async (m) => {
          const wrapped = await wrapDekForMember(newDek, userPriv, m.publicKey!, userPub)
          return { uid: m.uid, wrapped }
        }),
      )
      const fp = await dekFingerprint(newDek)
      await rotateDek(workspaceId, { dekFingerprint: fp, wraps })
      // Clear cached DEK so next encrypted-tool open re-fetches the new wrap.
      clearWsDek(workspaceId)
      await reloadStore()
      toast.success(
        "Encryption key rotated. Existing encrypted entries must be re-encrypted (coming in next release).",
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotation failed")
    } finally {
      setWorking(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={working}>
          {working ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="h-4 w-4 mr-2" />
          )}
          Rotate encryption key
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate encryption key?</AlertDialogTitle>
          <AlertDialogDescription>
            A new encryption key will be generated and wrapped for all current members. Existing
            encrypted entries will become unreadable with the new key until they&apos;re
            re-encrypted — automatic re-encryption ships in the next release. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRotate}>Rotate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
