"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { inviteToOrg, inviteToWorkspace } from "@/lib/invitations-api"

const ORG_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
]

const WS_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
]

export function InviteMemberDialog({
  scope,
  scopeId,
  open,
  onOpenChange,
}: {
  scope: "org" | "workspace"
  scopeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const roles = scope === "org" ? ORG_ROLES : WS_ROLES
  const defaultRole = roles[1].value

  const [email, setEmail] = useState("")
  const [role, setRole] = useState(defaultRole)
  const [loading, setLoading] = useState(false)

  function reset() {
    setEmail("")
    setRole(defaultRole)
    setLoading(false)
  }

  function handleClose(v: boolean) {
    if (!v) {
      reset()
      onOpenChange(false)
    } else {
      onOpenChange(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    setLoading(true)
    try {
      if (scope === "org") {
        await inviteToOrg(scopeId, trimmedEmail, role)
      } else {
        await inviteToWorkspace(scopeId, trimmedEmail, role)
      }
      toast.success(`Invitation sent to ${trimmedEmail}`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation")
      setLoading(false)
    }
  }

  const titleLabel = scope === "org" ? "Invite to organisation" : "Invite to workspace"
  const roleLabel = scope === "org" ? "Organisation role" : "Workspace role"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">{roleLabel}</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
