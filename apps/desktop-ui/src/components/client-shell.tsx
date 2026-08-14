"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, type ReactNode } from "react"
import { UserPreferencesSync } from "@/components/user-preferences-sync"
import { PinnedToolsPreferencesSync } from "@/components/pinned-tools-preferences-sync"
import { AppUpdateNotifier } from "@/components/app-update-notifier"
import { initTelemetry } from "@/lib/telemetry"

const GlobalCommandPalette = dynamic(
  () => import('@/components/global-command-palette').then((m) => m.GlobalCommandPalette),
  { ssr: false }
)
// Vercel Analytics / Speed Insights / Microsoft Clarity used to live here,
// inherited from the marketing site. All three are wrong for this app: the
// Vercel ones post to a host that does not exist in Tauri, and Clarity pulls a
// remote script that session-records an offline, local-first app. Usage now
// goes through lib/telemetry.ts — opt-in, anonymous, two events.
const ClientTelemetryConsent = dynamic(
  () => import('@/components/telemetry-consent-card').then((m) => m.TelemetryConsentCard),
  { ssr: false }
)
const ClientToaster = dynamic(
  () => import('@/components/branded-toaster').then((m) => m.BrandedToaster),
  { ssr: false }
)

type Props = {
  children: ReactNode
}

export function ClientShell({ children }: Props) {
  useEffect(() => {
    void initTelemetry()
  }, [])

  return (
    <>
      <UserPreferencesSync />
      <PinnedToolsPreferencesSync />
      <AppUpdateNotifier />
      <Suspense fallback={null}>
        <GlobalCommandPalette />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <ClientTelemetryConsent />
      </Suspense>
      <Suspense fallback={null}>
        <ClientToaster />
      </Suspense>
    </>
  )
}
