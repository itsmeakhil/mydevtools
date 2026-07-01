"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  listOrgMembers,
  listWorkspaceMembers,
  changeOrgRole,
  changeWorkspaceRole,
  removeOrgMember,
  removeWorkspaceMember,
  type Member,
} from "@/lib/members-api"
import { RoleSelect } from "@/components/role-select"
import { useConfirm } from "@/components/confirm-dialog"

export function MemberList({
  scope,
  scopeId,
}: {
  scope: "org" | "workspace"
  scopeId: string
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const list =
        scope === "org"
          ? await listOrgMembers(scopeId)
          : await listWorkspaceMembers(scopeId)
      setMembers(list)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [scope, scopeId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleRoleChange(uid: string, role: string) {
    try {
      if (scope === "org") {
        await changeOrgRole(scopeId, uid, role)
      } else {
        await changeWorkspaceRole(scopeId, uid, role)
      }
      toast.success("Role updated")
      await fetchMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role")
    }
  }

  async function handleRemove(uid: string) {
    const ok = await confirm({
      title: "Remove this member?",
      description: "They will lose access to this " + scope + ".",
      confirmLabel: "Remove",
      destructive: true,
    })
    if (!ok) return
    try {
      if (scope === "org") {
        await removeOrgMember(scopeId, uid)
      } else {
        await removeWorkspaceMember(scopeId, uid)
      }
      toast.success("Member removed")
      await fetchMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading members…
      </div>
    )
  }

  if (members.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">No members yet.</p>
  }

  return (
    <>
    <div className="divide-y divide-border/50 rounded-lg border border-border/50">
      {members.map((m) => (
        <div
          key={m.uid}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {m.display_name ?? m.email ?? m.uid}
            </p>
            {m.display_name && m.email && (
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            )}
          </div>
          <RoleSelect
            scope={scope}
            currentRole={m.role}
            onChange={(role) => handleRoleChange(m.uid, role)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(m.uid)}
            aria-label="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
    {confirmDialog}
    </>
  )
}
