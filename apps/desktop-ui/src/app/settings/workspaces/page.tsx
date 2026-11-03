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
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-[720px] mx-auto w-full pt-20 lg:pt-8">
      {/* Heading */}
      <div className="space-y-1">
        <p className="text-[13px] text-muted-foreground">Workspace</p>
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">
          Your Workspace
        </h2>
        <p className="text-sm text-muted-foreground">
          All your tools and data live in your personal workspace.
        </p>
      </div>

      {/* Personal workspace card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
        {workspace ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05]">
              <Briefcase className="h-[18px] w-[18px] text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-medium truncate">{workspace.name}</h4>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Personal
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
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
      <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05]">
            <ShieldCheck className="h-[18px] w-[18px] text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[13px] font-medium">Encrypted tools</h4>
            <p className="text-xs text-muted-foreground">
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
