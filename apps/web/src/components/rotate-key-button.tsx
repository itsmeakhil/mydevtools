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
import { verifyMemberKeys, trustMemberKeys } from "@/store/key-pinning-store"
import { useConfirm } from "@/components/confirm-dialog"
import { generateWorkspaceDek, wrapDekForMember, dekFingerprint } from "@/lib/workspace-crypto"
import { listMemberPublicKeys, rotateDek } from "@/lib/workspace-dek-api"
import { reencryptAllEntries } from "@/lib/dek-rotation"

export function RotateKeyButton({ workspaceId }: { workspaceId: string }) {
  const [working, setWorking] = useState(false)
  const userPriv = useUserKeypairStore((s) => s.privateKey)
  const userPub = useUserKeypairStore((s) => s.publicKey)
  const getDek = useWorkspaceDekStore((s) => s.getDek)
  const clearWsDek = useWorkspaceDekStore((s) => s.clearWorkspace)
  const reloadStore = useWorkspaceStore((s) => s.loadFromBackend)
  const { confirm, dialog: confirmDialog } = useConfirm()

  async function handleRotate() {
    if (!userPriv || !userPub) {
      toast.error("Generate your keypair first via Enable encrypted tools")
      return
    }
    setWorking(true)
    try {
      // Phase 0: capture the OLD DEK before we rotate so we can re-encrypt entries.
      const oldDek = await getDek(workspaceId)

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

      // H-2: TOFU-verify member public keys before wrapping the DEK to them.
      // A changed key may be a legit keypair reset — or a server substituting an
      // attacker key. Require explicit confirmation before trusting the change.
      const changed = verifyMemberKeys(ready)
      if (changed.length > 0) {
        const names = changed.map((m) => m.email ?? m.uid).join(", ")
        const ok = await confirm({
          title: "Member encryption keys changed",
          description:
            `These members' public keys differ from what was previously trusted: ${names}. ` +
            "This is expected if they reset their master password, but could also mean the " +
            "server substituted a key. Only continue if you trust the change — proceeding wraps " +
            "the workspace key to the new keys.",
          confirmLabel: "Trust new keys & rotate",
          destructive: true,
        })
        if (!ok) {
          toast.error("Rotation cancelled — member key change not trusted")
          return
        }
        trustMemberKeys(changed)
      }

      // Phase 1: generate new DEK + wraps, then atomically flip on server.
      const newDek = await generateWorkspaceDek()
      const wraps = await Promise.all(
        ready.map(async (m) => {
          const wrapped = await wrapDekForMember(newDek, userPriv, m.publicKey!, userPub)
          return { uid: m.uid, wrapped }
        }),
      )
      const fp = await dekFingerprint(newDek)
      await rotateDek(workspaceId, { dekFingerprint: fp, wraps })

      // Clear cached DEK immediately so any concurrent reads pick up the new wrap.
      clearWsDek(workspaceId)

      // Phase 2: re-encrypt all existing entries client-side if we had the old DEK.
      if (oldDek) {
        toast.info("Re-encrypting existing entries with new key…")
        const { rotated, failed } = await reencryptAllEntries(oldDek, newDek, ({ tool, current, total }) => {
          // Fire a toast update so users can see progress without flooding the UI.
          if (current === total || current % 10 === 0) {
            toast.info(`Re-encrypting ${tool}: ${current}/${total}`)
          }
        })
        await reloadStore()
        toast.success(
          `Rotation complete: ${rotated} entries re-encrypted${failed > 0 ? `, ${failed} failed` : ""}.`,
        )
      } else {
        // No old DEK available (e.g. first rotation before any entries were created).
        await reloadStore()
        toast.success("Encryption key rotated. No existing entries needed re-encryption.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotation failed")
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
    {confirmDialog}
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
            A new encryption key will be generated and wrapped for all current members. All
            existing encrypted entries will be automatically re-encrypted with the new key —
            do not close this tab until rotation completes. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRotate}>Rotate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
