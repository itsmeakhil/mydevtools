import { backendFetch } from '@/lib/backend-auth'

export type DashboardTaskStats = {
  total: number
  completed: number
  ongoing: number
  notStarted: number
}

export type DashboardAnalyticsSummary = {
  passwordEntries: number
  bookmarks: number
  bookmarkFolders: number
  tasks: DashboardTaskStats
  projects: number
  nosqlConnections: number
  notes: number
  apiClientCollections: number
  apiClientEnvironments: number
  apiClientHistoryEntries: number
  jsonFormatterDocuments: number
  codeSnippets: number
}

export async function fetchDashboardAnalyticsSummary(): Promise<DashboardAnalyticsSummary> {
  const res = await backendFetch('/api/backend/analytics/summary', { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Analytics failed (${res.status})`)
  }
  const data = (await res.json()) as DashboardAnalyticsSummary
  // Older backends omit `codeSnippets`; without this, dashboard totals become NaN.
  return {
    ...data,
    codeSnippets: data.codeSnippets ?? 0,
  }
}
