"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ORG_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
]

const WS_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
]

export function RoleSelect({
  scope,
  currentRole,
  onChange,
}: {
  scope: "org" | "workspace"
  currentRole: string
  onChange: (role: string) => void
}) {
  const roles = scope === "org" ? ORG_ROLES : WS_ROLES

  return (
    <Select value={currentRole} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[120px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.value} value={r.value} className="text-xs">
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
