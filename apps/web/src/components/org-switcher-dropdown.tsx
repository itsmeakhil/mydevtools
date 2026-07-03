"use client"
import { useState } from "react"
import { Building2, Check, ChevronDown, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveOrg, useWorkspaceStore } from "@/store/workspace-store"
import { CreateOrgDialog } from "@/components/create-org-dialog"

/**
 * Organization switcher — lives in the top nav, beside the page title.
 * Switching org cascades to its default workspace via `setActiveOrg`.
 */
export function OrgSwitcherDropdown() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const orgs = useWorkspaceStore((s) => s.orgs)
  const activeOrg = useActiveOrg()
  const setActiveOrg = useWorkspaceStore((s) => s.setActiveOrg)
  const [createOpen, setCreateOpen] = useState(false)

  if (!hydrated || !activeOrg) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 max-w-[13rem] items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:border-primary/40 hover:bg-muted/60"
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{activeOrg.name}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Organizations
          </DropdownMenuLabel>
          {orgs.map((org) => {
            const isActive = org.id === activeOrg.id
            return (
              <DropdownMenuItem
                key={org.id}
                className={isActive ? "bg-accent/60" : ""}
                onSelect={() => {
                  if (isActive) return
                  setActiveOrg(org.id).catch((e) => {
                    toast.error(
                      e instanceof Error ? e.message : "Could not switch organization",
                    )
                  })
                }}
              >
                <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{org.name}</span>
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  {org.org_role}
                </span>
                {isActive && <Check className="ml-1.5 h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
