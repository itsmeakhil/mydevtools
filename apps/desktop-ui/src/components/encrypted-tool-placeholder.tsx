"use client"
import Link from "next/link"
import { Lock, ArrowRight, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useActiveWorkspace, useWorkspaceStore } from "@/store/workspace-store"

export function EncryptedToolPlaceholder({ toolName }: { toolName: string }) {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const activeWs = useActiveWorkspace()

  const personal = workspaces.find((w) => w.is_personal)
  const isAdmin = activeWs?.ws_role === "admin"

  const switchToPersonal = async () => {
    if (personal) await setActiveWorkspace(personal.id)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md rounded-2xl shadow-elev-2">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <Lock className="h-8 w-8 text-muted-foreground/60" />
          <h2 className="text-[17px] font-semibold">{toolName} needs encryption</h2>
          <p className="text-[13px] text-muted-foreground">
            This workspace hasn&apos;t enabled end-to-end encryption yet.
            {isAdmin
              ? " Turn it on in Workspace settings to use this tool here."
              : " Ask an admin to enable it in Workspace settings, or use your Personal workspace."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {isAdmin && (
              <Button asChild>
                <Link href="/settings/workspaces">
                  <Settings className="mr-2 h-4 w-4" />
                  Open Workspace settings
                </Link>
              </Button>
            )}
            {personal && (
              <Button variant={isAdmin ? "outline" : "default"} onClick={switchToPersonal}>
                Switch to Personal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
