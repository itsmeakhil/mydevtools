const CHANNEL_NAME = "workspace-events"

export type WorkspaceMessage =
  | { type: "workspace-changed"; workspaceId: string }
  | { type: "workspace-cleared" }

let channel: BroadcastChannel | null = null

export function getWorkspaceBroadcast(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (!("BroadcastChannel" in window)) return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function broadcastWorkspaceChanged(workspaceId: string): void {
  getWorkspaceBroadcast()?.postMessage({
    type: "workspace-changed",
    workspaceId,
  } satisfies WorkspaceMessage)
}

export function subscribeToWorkspaceBroadcast(
  handler: (msg: WorkspaceMessage) => void
): () => void {
  const ch = getWorkspaceBroadcast()
  if (!ch) return () => {}
  const listener = (event: MessageEvent<WorkspaceMessage>) => handler(event.data)
  ch.addEventListener("message", listener)
  return () => ch.removeEventListener("message", listener)
}
