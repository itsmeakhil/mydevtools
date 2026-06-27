"use client"

import { useState } from "react"
import { Pencil, Trash2, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { Workspace } from "@/lib/workspace-api"
import { renameWorkspace, deleteWorkspace } from "@/lib/org-api"
import { useWorkspaceStore } from "@/store/workspace-store"
import { MemberList } from "@/components/member-list"
import { InviteMemberDialog } from "@/components/invite-member-dialog"

export function WorkspaceSection({ workspace }: { workspace: Workspace }) {
  const { loadFromBackend } = useWorkspaceStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(workspace.name)
  const [saving, setSaving] = useState(false)

  const isPersonal = workspace.is_personal
  const canManage = !isPersonal && workspace.ws_role === "admin"

  async function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === workspace.name) {
      setRenaming(false)
      return
    }
    setSaving(true)
    try {
      await renameWorkspace(workspace.id, trimmed)
      await loadFromBackend()
      toast.success("Workspace renamed")
      setRenaming(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename workspace")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete workspace "${workspace.name}"? This action cannot be undone.`
      )
    )
      return
    try {
      await deleteWorkspace(workspace.id)
      await loadFromBackend()
      toast.success("Workspace deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workspace")
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename()
                  if (e.key === "Escape") {
                    setRenaming(false)
                    setRenameValue(workspace.name)
                  }
                }}
              />
              <Button
                size="sm"
                className="h-7 text-xs rounded-full"
                onClick={handleRename}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs rounded-full"
                onClick={() => {
                  setRenaming(false)
                  setRenameValue(workspace.name)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h4 className="font-medium truncate">{workspace.name}</h4>
          )}
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] uppercase tracking-wider"
          >
            {workspace.ws_role}
          </Badge>
          {isPersonal && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Personal
            </Badge>
          )}
        </div>

        {canManage && !renaming && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                setRenameValue(workspace.name)
                setRenaming(true)
              }}
            >
              <Pencil className="h-3 w-3" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Members subsection */}
      <div className="space-y-2">
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
            Invite
          </Button>
        </div>
        <MemberList scope="workspace" scopeId={workspace.id} />
      </div>

      <InviteMemberDialog
        scope="workspace"
        scopeId={workspace.id}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  )
}
