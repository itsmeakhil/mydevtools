"use client"

import { Briefcase } from "lucide-react"
import { useActiveOrg, useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function WorkspaceSwitcher() {
  const hydrated = useWorkspaceStore((s) => s.hydrated)
  const ws = useActiveWorkspace()
  const org = useActiveOrg()

  if (!hydrated || !ws) return null

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-sm font-medium text-foreground/90"
            data-testid="workspace-switcher"
          >
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[140px]">{ws.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          <div className="font-medium">{ws.name}</div>
          {org && <div className="text-muted-foreground">{org.name}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
