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

function parse(key: string): unknown {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function arrayLen(key: string): number {
  const v = parse(key)
  return Array.isArray(v) ? v.length : 0
}

/**
 * Local, offline analytics — counts data straight from the browser's own
 * persistence instead of a backend. Only tools that actually persist locally
 * report real numbers today: code snippets (zustand persist) and the API
 * client (collections / environments / history in localStorage).
 *
 * ponytail: passwords, bookmarks, tasks, notes, projects, nosql and JSON docs
 * still live in the (encrypted) backend vault / MongoDB, so they read 0 until
 * those tools move to local storage. The panel renders 0s gracefully.
 */
export async function fetchDashboardAnalyticsSummary(): Promise<DashboardAnalyticsSummary> {
  const snippetStore = parse('snippet-manager-storage-v1') as
    | { state?: { snippets?: unknown } }
    | null
  const snippets = snippetStore?.state?.snippets

  return {
    passwordEntries: 0,
    bookmarks: 0,
    bookmarkFolders: 0,
    tasks: normalizeTasks(null),
    projects: 0,
    nosqlConnections: 0,
    notes: 0,
    apiClientCollections: arrayLen('api-client-collections'),
    apiClientEnvironments: arrayLen('api-client-environments'),
    apiClientHistoryEntries: arrayLen('api-client-history'),
    jsonFormatterDocuments: 0,
    codeSnippets: Array.isArray(snippets) ? snippets.length : 0,
  }
}
