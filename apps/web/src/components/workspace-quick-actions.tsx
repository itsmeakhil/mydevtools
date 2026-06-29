"use client"
import Link from "next/link"
import { Settings } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace-store"

// Top-right cluster — just the settings gear now. Org creation lives inside
// the org switcher dropdown (sidebar header).
export function WorkspaceQuickActions() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  if (!hydrated) return null

  return (
    <Link
      href="/settings/workspaces"
      aria-label="Workspace settings"
      title="Workspace settings"
      className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
    >
      <Settings className="h-4 w-4" />
    </Link>
  )
}
