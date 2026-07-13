"use client"

import dynamic from "next/dynamic"
import { Suspense, type ReactNode } from "react"
import { UserPreferencesSync } from "@/components/user-preferences-sync"
import { PinnedToolsPreferencesSync } from "@/components/pinned-tools-preferences-sync"
import { AppUpdateNotifier } from "@/components/app-update-notifier"
import { AuthLogoutListener } from "@/components/auth-logout-listener"

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
const ClientClarity = dynamic(
  () => import('@/components/clarity-analytics').then((m) => m.ClarityAnalytics),
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
  return (
    <>
      <UserPreferencesSync />
      <PinnedToolsPreferencesSync />
      <AppUpdateNotifier />
      <AuthLogoutListener />
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
        <ClientClarity />
      </Suspense>
      <Suspense fallback={null}>
        <ClientToaster />
      </Suspense>
    </>
  )
}
