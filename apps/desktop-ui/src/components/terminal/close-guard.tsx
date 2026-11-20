"use client"

import * as React from "react"
import { useTerminalStore } from "@/store/terminal-store"
import { needsAttention } from "@/lib/terminal/status"

/** Close panes now, or after a confirm when something is still running in them. */
export type CloseGuard = (ids: string[], close: () => void) => void

export const CloseGuardContext = React.createContext<CloseGuard>((_ids, close) => close())
export const useCloseGuard = () => React.useContext(CloseGuardContext)

/** A running command or an agent waiting on you (or just finished) would be ended by closing. */
export const anyBusy = (ids: string[]) => {
  const st = useTerminalStore.getState().statuses
  return ids.some((id) => st[id] === "running" || needsAttention(st[id]))
}
