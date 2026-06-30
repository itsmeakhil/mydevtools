"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, Check, Loader2, Mail, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  acceptInvitation,
  revokeInvitation,
  type Invitation,
} from "@/lib/invitations-api"
import { listNotifications, type Notification } from "@/lib/notifications"
import { useWorkspaceStore } from "@/store/workspace-store"

const POLL_INTERVAL_MS = 30_000

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setItems(await listNotifications())
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const count = items.length

  async function handleAccept(inv: Invitation) {
    setBusy(inv.id)
    try {
      const result = await acceptInvitation(inv.token)
      await useWorkspaceStore.getState().loadFromBackend()
      if (result.workspace_id) {
        await useWorkspaceStore.getState().setActiveWorkspace(result.workspace_id)
      }
      toast.success("Invitation accepted")
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation")
    } finally {
      setBusy(null)
    }
  }

  async function handleDecline(inv: Invitation) {
    setBusy(inv.id)
    try {
      await revokeInvitation(inv.token)
      toast.success("Invitation declined")
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline invitation")
    } finally {
      setBusy(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
          aria-label={count > 0 ? `${count} notification${count === 1 ? "" : "s"}` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-sm font-medium">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          items.map((n) => {
            if (n.kind === "invitation") {
              const inv = n.data
              const isWs = !!inv.workspace_id
              const role = isWs ? inv.invited_role_ws : inv.invited_role_org
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/40"
                >
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {isWs ? "Workspace invitation" : "Organisation invitation"}
                    </p>
                    {role && (
                      <p className="text-xs text-muted-foreground">
                        Role: <span className="font-medium">{role}</span>
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={busy === inv.id}
                        onClick={() => handleAccept(inv)}
                      >
                        {busy === inv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={busy === inv.id}
                        onClick={() => handleDecline(inv)}
                      >
                        <X className="h-3 w-3 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
