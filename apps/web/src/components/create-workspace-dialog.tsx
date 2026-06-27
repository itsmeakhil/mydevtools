"use client"
import type { ReactNode } from "react"

export function CreateWorkspaceDialog({
  orgId, open, onOpenChange,
}: { orgId: string; open: boolean; onOpenChange: (open: boolean) => void }): ReactNode {
  // ponytail: Task 14 ships the real form
  if (!open) return null
  return null
}
