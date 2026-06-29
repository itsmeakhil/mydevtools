import type { Invitation } from "@/lib/invitations-api"
import { listPending } from "@/lib/invitations-api"

/**
 * Unified in-app notification model. Today only invitations exist; future
 * sources (workspace key rotations, mentions, billing alerts) add a new variant
 * here and a fetcher below. The bell renders any variant via a tiny `kind`
 * switch — no extra plumbing per source.
 */
export type Notification =
  | { kind: "invitation"; id: string; createdAt: number; data: Invitation }

/** Aggregate every source into one chronologically-sorted feed. */
export async function listNotifications(): Promise<Notification[]> {
  const [invitations] = await Promise.all([
    listPending().catch(() => [] as Invitation[]),
    // future: listMentions(), listAlerts(), …
  ])
  const items: Notification[] = invitations.map((inv) => ({
    kind: "invitation",
    id: inv.id,
    createdAt: inv.created_at,
    data: inv,
  }))
  items.sort((a, b) => b.createdAt - a.createdAt)
  return items
}
