"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { listPending, acceptInvitation, type Invitation } from "@/lib/invitations-api"
import { useWorkspaceStore } from "@/store/workspace-store"

const POLL_INTERVAL_MS = 30_000

export function PendingInvitationsBadge() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const pending = await listPending()
      setInvitations(pending)
    } catch {
      // Silently ignore — badge is non-critical
    }
  }, [])

  useEffect(() => {
    fetchPending()
    const id = setInterval(fetchPending, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchPending])

  if (invitations.length === 0) return null

  async function handleAccept(invitation: Invitation) {
    const token = invitation.token
    setAccepting(token)
    try {
      const result = await acceptInvitation(token)
      await useWorkspaceStore.getState().loadFromBackend()
      if (result.workspace_id) {
        await useWorkspaceStore.getState().setActiveWorkspace(result.workspace_id)
      }
      toast.success("Invitation accepted")
      await fetchPending()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation")
    } finally {
      setAccepting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border/60 bg-muted/40 text-foreground/90 hover:border-primary/40 cursor-pointer"
          aria-label={`${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {invitations.length > 9 ? "9+" : invitations.length}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-sm font-medium">
          Pending Invitations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {invitations.map((inv) => (
          <DropdownMenuItem
            key={inv.id}
            className="flex items-center justify-between gap-3 py-2.5"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {inv.workspace_id ? "Workspace invitation" : "Organisation invitation"}
              </p>
              <p className="text-xs text-muted-foreground">
                Role:{" "}
                <span className="font-medium">
                  {inv.workspace_id ? inv.invited_role_ws : inv.invited_role_org}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 h-7 text-xs"
              disabled={accepting === inv.id}
              onClick={() => handleAccept(inv)}
            >
              {accepting === inv.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Accept"
              )}
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
