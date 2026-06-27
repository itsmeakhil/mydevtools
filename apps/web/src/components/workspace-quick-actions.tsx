"use client"
import { useState } from "react"
import Link from "next/link"
import { Plus, Settings } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace-store"
import { CreateOrgDialog } from "@/components/create-org-dialog"

// Hoppscotch-style top-right cluster: switcher + "+" + settings gear.
// "+" opens the create-org dialog directly (one-click); the dropdown still
// carries per-org "New workspace" actions for finer-grained creates.
export function WorkspaceQuickActions() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)

  if (!hydrated) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOrgDialogOpen(true)}
        aria-label="Create organization"
        title="New organization"
        className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
      <Link
        href="/settings/workspaces"
        aria-label="Workspace settings"
        title="Workspace settings"
        className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </Link>

      <CreateOrgDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} />
    </>
  )
}
