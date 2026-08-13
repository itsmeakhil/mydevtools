"use client"

import { useEffect, useState } from "react"
import { getUserPreferences } from "@/lib/user-preferences-api"
import { OnboardingModal } from "@/components/onboarding-modal"

type State = "loading" | "show" | "done"

/** First-run walkthrough. Whether it has run is local preference state. */
export function OnboardingGate() {
  const [state, setState] = useState<State>("loading")

  useEffect(() => {
    let cancelled = false
    void getUserPreferences()
      .then((prefs) => {
        if (!cancelled) setState(prefs.onboardingCompleted ? "done" : "show")
      })
      .catch(() => {
        // Store unavailable — never block the app on the walkthrough.
        if (!cancelled) setState("done")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state !== "show") return null

  return <OnboardingModal onComplete={() => setState("done")} />
}
