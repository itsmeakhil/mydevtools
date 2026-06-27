"use client"

import { useEffect, useState } from "react"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/workspace-store"
import { OrgSection } from "./org-section"
import { CreateOrgDialog } from "@/components/create-org-dialog"

export default function WorkspacesSettingsPage() {
  const { orgs, hydrated, loadFromBackend } = useWorkspaceStore()
  const [createOrgOpen, setCreateOrgOpen] = useState(false)

  useEffect(() => {
    if (!hydrated) {
      loadFromBackend()
    }
  }, [hydrated, loadFromBackend])

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 bg-background/50">
      {/* Heading */}
      <div className="space-y-1.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary to-violet-500" />
          Collaboration
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Organizations &amp; Workspaces
        </h2>
        <p className="text-muted-foreground">
          Manage your organisations, workspaces, and team members.
        </p>
      </div>

      {/* Org list */}
      <div className="space-y-6">
        {orgs.length === 0 && hydrated ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No organisations yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Create your first organisation to start collaborating.
            </p>
            <Button
              variant="default"
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setCreateOrgOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Organisation
            </Button>
          </div>
        ) : (
          <>
            {orgs.map((org) => (
              <OrgSection key={org.id} org={org} />
            ))}

            {/* Footer CTA */}
            <div className="flex justify-start pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => setCreateOrgOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Organisation
              </Button>
            </div>
          </>
        )}
      </div>

      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </div>
  )
}
