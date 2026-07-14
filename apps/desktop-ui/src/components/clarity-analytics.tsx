"use client"

import { useEffect } from "react"

// Microsoft Clarity heatmaps + session replays. No-op unless
// NEXT_PUBLIC_CLARITY_PROJECT_ID is set (so it stays off in local dev),
// matching how Vercel Analytics only reports in production.
// Data lives in clarity.microsoft.com — nothing touches our backend.
let initialized = false // ponytail: module guard so StrictMode/remounts can't double-inject the script

export function ClarityAnalytics() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
    if (!projectId || initialized) return
    initialized = true
    import("@microsoft/clarity").then((m) => m.default.init(projectId))
  }, [])

  return null
}
