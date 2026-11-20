import { useTabStore } from "@/store/tab-store"

const API_CLIENT_PATH = "/app/api-client"

/** A request another tool (the terminal's port chips) asks the API client to open. */
export interface HandoffRequest {
  name: string
  method: "GET"
  url: string
}

let pending: HandoffRequest | null = null
const listeners = new Set<() => void>()

/** Open `req` as a new API client tab, switching to the API client. */
export function openInApiClient(req: HandoffRequest, navigate: (path: string) => void) {
  pending = req
  listeners.forEach((l) => l())
  useTabStore.getState().openTab(API_CLIENT_PATH)
  navigate(API_CLIENT_PATH)
}

/** The waiting request, once (the API client takes it on mount and on every handoff). */
export function takeApiClientHandoff(): HandoffRequest | null {
  const r = pending
  pending = null
  return r
}

/** Called when a request is handed over while the API client is already open. */
export function onApiClientHandoff(cb: () => void): () => void {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}
