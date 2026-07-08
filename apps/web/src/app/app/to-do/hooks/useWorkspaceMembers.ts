"use client";

import { useQuery } from "@tanstack/react-query";
import { listWorkspaceMembers, type Member } from "@/lib/members-api";
import { useActiveWorkspace } from "@/store/workspace-store";

/**
 * Members of the active workspace, for assignee pickers. Reuses the existing
 * workspace members API — no new backend endpoint. In a personal workspace the
 * list is just the owner; assignment shines in shared workspaces.
 */
export function useWorkspaceMembers() {
  const ws = useActiveWorkspace();
  const wsId = ws?.id ?? null;

  const query = useQuery<Member[]>({
    queryKey: ["workspaceMembers", wsId],
    queryFn: () => listWorkspaceMembers(wsId as string),
    enabled: !!wsId,
    staleTime: 5 * 60 * 1000, // members change rarely
  });

  return {
    members: query.data ?? [],
    isLoading: query.isPending && !!wsId,
    isShared: !!ws && !ws.is_personal,
  };
}

export function memberLabel(m: Member | undefined | null): string {
  if (!m) return "";
  return m.display_name || m.email || m.uid;
}

export function memberInitials(m: Member | undefined | null): string {
  const label = memberLabel(m);
  if (!label) return "?";
  const parts = label.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}
