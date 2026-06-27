"use client"
import { useState } from "react"
import { Briefcase, Plus, ChevronsUpDown } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { CreateOrgDialog } from "@/components/create-org-dialog"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { PendingInvitationsBadge } from "@/components/pending-invitations-badge"


export function WorkspaceSwitcherDropdown() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const ws = useActiveWorkspace()
  const orgs = useWorkspaceStore((s) => s.orgs)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [wsDialogOrgId, setWsDialogOrgId] = useState<string | null>(null)

  if (!hydrated || !ws) return null

  const wsByOrg: Record<string, typeof workspaces> = {}
  for (const w of workspaces) {
    if (!wsByOrg[w.org_id]) wsByOrg[w.org_id] = []
    wsByOrg[w.org_id].push(w)
  }

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
            {orgs.map((org) => (
              <div key={org.id}>
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                  {org.name}
                </DropdownMenuLabel>
                {(wsByOrg[org.id] ?? []).map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    className={w.id === ws.id ? "bg-accent/60" : ""}
                    onSelect={() => setActiveWorkspace(w.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{w.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{w.ws_role}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                {(org.org_role === "owner" || org.org_role === "admin") && (
                  <DropdownMenuItem onSelect={() => setWsDialogOrgId(org.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New workspace
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </div>
            ))}
            <DropdownMenuItem onSelect={() => setOrgDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateOrgDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} />
      {wsDialogOrgId && (
        <CreateWorkspaceDialog
          orgId={wsDialogOrgId}
          open
          onOpenChange={(o) => o ? null : setWsDialogOrgId(null)}
        />
      )}
    </>
  )
}
