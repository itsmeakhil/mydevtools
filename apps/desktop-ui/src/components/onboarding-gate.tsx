"use client"

import { useEffect, useState } from "react"
import useAuth from "@/utils/useAuth"
import { getMe } from "@/lib/onboarding-api"
import { OnboardingModal } from "@/components/onboarding-modal"

type State = "loading" | "show" | "done"

export function OnboardingGate() {
  const { user, loading: authLoading } = useAuth(false)
  const [state, setState] = useState<State>("loading")

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false

    const check = async () => {
      try {
        const profile = await getMe()
        if (!cancelled) {
          setState(profile.onboarding_completed ? "done" : "show")
        }
      } catch {
        // If we can't fetch, don't block the user — skip onboarding
        if (!cancelled) setState("done")
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  if (state !== "show") return null

  return <OnboardingModal onComplete={() => setState("done")} />
}
