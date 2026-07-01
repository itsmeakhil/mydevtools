"use client"

import { useState } from "react"
import { Pencil, Trash2, UserPlus, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { Org } from "@/lib/workspace-api"
import { renameOrg, deleteOrg } from "@/lib/org-api"
import { useWorkspaceStore } from "@/store/workspace-store"
import { MemberList } from "@/components/member-list"
import { WorkspaceSection } from "./workspace-section"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { InviteMemberDialog } from "@/components/invite-member-dialog"
import { useConfirm } from "@/components/confirm-dialog"

export function OrgSection({ org }: { org: Org }) {
  const { workspaces, loadFromBackend } = useWorkspaceStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(org.name)
  const [saving, setSaving] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirm()

  // System orgs (Mydevtools Cloud) are platform-managed — no member roster shown.
  const isSystem = org.kind === "system"
  const isOwner = org.org_role === "owner"
  // System orgs let any member create their own workspaces.
  const canAddWorkspace =
    isSystem || org.org_role === "owner" || org.org_role === "admin"
  const orgWorkspaces = workspaces.filter((w) => w.org_id === org.id)

  async function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === org.name) {
      setRenaming(false)
      return
    }
    setSaving(true)
    try {
      await renameOrg(org.id, trimmed)
      await loadFromBackend()
      toast.success("Organisation renamed")
      setRenaming(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename organisation")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete organisation "${org.name}"?`,
      description: "This will remove all workspaces and cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteOrg(org.id)
      await loadFromBackend()
      toast.success("Organisation deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete organisation")
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm p-6 space-y-6">
      {/* Org header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename()
                  if (e.key === "Escape") {
                    setRenaming(false)
                    setRenameValue(org.name)
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8 text-xs rounded-full"
                onClick={handleRename}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs rounded-full"
                onClick={() => {
                  setRenaming(false)
                  setRenameValue(org.name)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h3 className="text-lg font-semibold truncate">{org.name}</h3>
          )}
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] uppercase tracking-wider"
          >
            {org.org_role}
          </Badge>
        </div>

        {isOwner && !renaming && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setRenameValue(org.name)
                setRenaming(true)
              }}
            >
              <Pencil className="h-3 w-3" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Workspaces section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </p>
          {canAddWorkspace && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setCreateWsOpen(true)}
            >
              <Plus className="h-3 w-3" />
              New Workspace
            </Button>
          )}
        </div>
        {orgWorkspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspaces in this organisation.</p>
        ) : (
          <div className="space-y-3">
            {orgWorkspaces.map((ws) => (
              <WorkspaceSection key={ws.id} workspace={ws} />
            ))}
          </div>
        )}
      </div>

      {/* Members section — hidden for system orgs (Mydevtools Cloud). */}
      {!isSystem && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Members
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="h-3 w-3" />
              Invite Member
            </Button>
          </div>
          <MemberList scope="org" scopeId={org.id} />
        </div>
      )}

      <CreateWorkspaceDialog
        orgId={org.id}
        open={createWsOpen}
        onOpenChange={setCreateWsOpen}
      />

      <InviteMemberDialog
        scope="org"
        scopeId={org.id}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      {confirmDialog}
    </div>
  )
}
