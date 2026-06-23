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

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function normalizeTasks(t: unknown): DashboardTaskStats {
  const obj = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
  return {
    total: num(obj.total),
    completed: num(obj.completed),
    ongoing: num(obj.ongoing),
    notStarted: num(obj.notStarted),
  }
}

export async function fetchDashboardAnalyticsSummary(): Promise<DashboardAnalyticsSummary> {
  const res = await backendFetch('/api/backend/analytics/summary', { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Analytics failed (${res.status})`)
  }
  const raw = (await res.json()) as Partial<DashboardAnalyticsSummary> & {
    tasks?: unknown
  }
  // Defensive normalization — any missing or non-numeric field would otherwise
  // surface as `NaN` in totals or crash the panel via `data.tasks.total`.
  return {
    passwordEntries: num(raw.passwordEntries),
    bookmarks: num(raw.bookmarks),
    bookmarkFolders: num(raw.bookmarkFolders),
    tasks: normalizeTasks(raw.tasks),
    projects: num(raw.projects),
    nosqlConnections: num(raw.nosqlConnections),
    notes: num(raw.notes),
    apiClientCollections: num(raw.apiClientCollections),
    apiClientEnvironments: num(raw.apiClientEnvironments),
    apiClientHistoryEntries: num(raw.apiClientHistoryEntries),
    jsonFormatterDocuments: num(raw.jsonFormatterDocuments),
    codeSnippets: num(raw.codeSnippets),
  }
}
