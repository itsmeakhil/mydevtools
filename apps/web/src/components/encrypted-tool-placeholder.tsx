"use client"
import Link from "next/link"
import { Lock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWorkspaceStore } from "@/store/workspace-store"

export function EncryptedToolPlaceholder({ toolName }: { toolName: string }) {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  const personal = workspaces.find((w) => w.is_personal)

  const switchToPersonal = async () => {
    if (personal) await setActiveWorkspace(personal.id)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md">
        <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{toolName} is Personal-only</h2>
          <p className="text-sm text-muted-foreground">
            Encrypted tools are available in your Personal workspace only.
            End-to-end encryption for shared workspaces ships in the next release.
          </p>
          {personal && (
            <Button onClick={switchToPersonal} className="mt-2">
              Switch to Personal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
