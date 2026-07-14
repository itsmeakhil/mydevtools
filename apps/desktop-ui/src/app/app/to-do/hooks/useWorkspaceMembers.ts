"use client";

import useAuth from "@/utils/useAuth";

export type Member = {
  uid: string;
  email: string | null;
  display_name: string | null;
  role: string;
  since: number;
};

/**
 * Members available for assignee pickers. Workspaces are single-user (personal)
 * now that shared/org collaboration has been removed, so the only assignable
 * member is the current user.
 */
export function useWorkspaceMembers() {
  const { user } = useAuth();

  const members: Member[] = user
    ? [
        {
          uid: user.uid,
          email: user.email ?? null,
          display_name: user.displayName ?? null,
          role: "admin",
          since: 0,
        },
      ]
    : [];

  return {
    members,
    isLoading: false,
    isShared: false,
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
