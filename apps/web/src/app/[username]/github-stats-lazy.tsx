'use client'

import dynamic from 'next/dynamic'

export const GithubStatsSection = dynamic(
  () => import('./github-stats-section').then((m) => m.GithubStatsSection),
  {
    ssr: false,
    loading: () => <div className="w-full mt-14 h-64 rounded-2xl bg-muted/30 animate-pulse" />,
  }
)
