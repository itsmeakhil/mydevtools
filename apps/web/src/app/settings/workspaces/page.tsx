"use client"

import { useEffect } from "react"
import { Briefcase, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useWorkspaceStore, useActiveWorkspace } from "@/store/workspace-store"

export default function WorkspacesSettingsPage() {
  const { hydrated, loadFromBackend } = useWorkspaceStore()
  const workspace = useActiveWorkspace()

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
          Workspace
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Your Workspace
        </h2>
        <p className="text-muted-foreground">
          All your tools and data live in your personal workspace.
        </p>
      </div>

      {/* Personal workspace card */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-5">
        {workspace ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{workspace.name}</h4>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Personal
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Private to you — only you can access this data.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {hydrated ? "No workspace found." : "Loading…"}
          </p>
        )}
      </div>

      {/* Encryption note */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="font-medium">Encrypted tools</h4>
            <p className="text-sm text-muted-foreground">
              Password Manager, API Key Vault, and Environment Manager are
              end-to-end encrypted with your master password. Set or unlock your
              master password to use them.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
