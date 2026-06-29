"use client"
import { useState } from "react"
import { Briefcase, Check, Plus, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useActiveOrg,
  useActiveWorkspace,
  useWorkspaceStore,
} from "@/store/workspace-store"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { PendingInvitationsBadge } from "@/components/pending-invitations-badge"

/**
 * Workspace switcher — top-right of the topbar, beside the user avatar.
 * Scoped to the ACTIVE org (org switching is handled by OrgSwitcherDropdown).
 */
export function WorkspaceSwitcherDropdown() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const ws = useActiveWorkspace()
  const org = useActiveOrg()
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const [wsDialogOpen, setWsDialogOpen] = useState(false)

  if (!hydrated || !ws || !org) return null

  const orgWorkspaces = workspaces.filter((w) => w.org_id === org.id)
  // System orgs (Mydevtools Cloud) — any member can create their own workspaces.
  const canCreate =
    org.kind === "system" || org.org_role === "owner" || org.org_role === "admin"

  return (
    <>
      <div className="flex items-center gap-1.5">
        <PendingInvitationsBadge />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-sm font-medium text-foreground/90 hover:border-primary/40 cursor-pointer">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[140px]">{ws.name}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Workspaces in {org.name}
            </DropdownMenuLabel>
            {orgWorkspaces.map((w) => {
              const isActive = w.id === ws.id
              return (
                <DropdownMenuItem
                  key={w.id}
                  className={isActive ? "bg-accent/60" : ""}
                  onSelect={() => {
                    if (isActive) return
                    setActiveWorkspace(w.id).catch((e) => {
                      toast.error(
                        e instanceof Error ? e.message : "Could not switch workspace",
                      )
                    })
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{w.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{w.ws_role}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })}
            {canCreate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setWsDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New workspace
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {wsDialogOpen && (
        <CreateWorkspaceDialog
          orgId={org.id}
          open
          onOpenChange={(o) => (o ? null : setWsDialogOpen(false))}
        />
      )}
    </>
  )
}
