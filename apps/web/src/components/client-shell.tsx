"use client"

import dynamic from "next/dynamic"
import { Suspense, type ReactNode } from "react"
import { UserPreferencesSync } from "@/components/user-preferences-sync"
import { ToolVisibilityPreferencesSync } from "@/components/tool-visibility-preferences-sync"
import { PinnedToolsPreferencesSync } from "@/components/pinned-tools-preferences-sync"
import { AppUpdateNotifier } from "@/components/app-update-notifier"

const GlobalCommandPalette = dynamic(
  () => import('@/components/global-command-palette').then((m) => m.GlobalCommandPalette),
  { ssr: false }
)
const ClientAnalytics = dynamic(
  () => import('@vercel/analytics/next').then((m) => m.Analytics),
  { ssr: false }
)
const ClientSpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false }
)
const ClientToaster = dynamic(
  () => import('sonner').then((m) => m.Toaster),
  { ssr: false }
)

type Props = {
  children: ReactNode
}

export function ClientShell({ children }: Props) {
  return (
    <>
      <UserPreferencesSync />
      <ToolVisibilityPreferencesSync />
      <PinnedToolsPreferencesSync />
      <AppUpdateNotifier />
      <Suspense fallback={null}>
        <GlobalCommandPalette />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <ClientAnalytics />
      </Suspense>
      <Suspense fallback={null}>
        <ClientSpeedInsights />
      </Suspense>
      <Suspense fallback={null}>
        <ClientToaster />
      </Suspense>
    </>
  )
}
