import { fetchDashboardAnalyticsSummary } from "../dashboard-analytics-api"

// localStorage shim for jest-environment-node
const storage: Record<string, string> = {}
const memoryLocalStorage = {
    getItem: (k: string) => (k in storage ? storage[k] : null),
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { for (const k of Object.keys(storage)) delete storage[k] },
    key: (i: number) => Object.keys(storage)[i] ?? null,
    get length() { return Object.keys(storage).length },
}
;(globalThis as unknown as { window: object }).window = {}
;(globalThis as unknown as { localStorage: typeof memoryLocalStorage }).localStorage = memoryLocalStorage

beforeEach(() => memoryLocalStorage.clear())

describe("fetchDashboardAnalyticsSummary (local)", () => {
    it("returns all-zero when nothing is stored", async () => {
        const s = await fetchDashboardAnalyticsSummary()
        expect(s.codeSnippets).toBe(0)
        expect(s.apiClientHistoryEntries).toBe(0)
        expect(s.tasks).toEqual({ total: 0, completed: 0, ongoing: 0, notStarted: 0 })
    })

    it("counts snippets and api-client arrays from localStorage", async () => {
        localStorage.setItem(
            "snippet-manager-storage-v1",
            JSON.stringify({ state: { snippets: [{ id: "a" }, { id: "b" }] }, version: 0 }),
        )
        localStorage.setItem("api-client-history", JSON.stringify([{}, {}, {}]))
        localStorage.setItem("api-client-environments", JSON.stringify([{}]))
        const s = await fetchDashboardAnalyticsSummary()
        expect(s.codeSnippets).toBe(2)
        expect(s.apiClientHistoryEntries).toBe(3)
        expect(s.apiClientEnvironments).toBe(1)
    })

    it("survives malformed JSON without throwing", async () => {
        localStorage.setItem("snippet-manager-storage-v1", "{not json")
        localStorage.setItem("api-client-history", "42")
        const s = await fetchDashboardAnalyticsSummary()
        expect(s.codeSnippets).toBe(0)
        expect(s.apiClientHistoryEntries).toBe(0)
    })
})
