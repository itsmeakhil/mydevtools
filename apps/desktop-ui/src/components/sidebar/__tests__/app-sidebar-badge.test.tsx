/**
 * Terminal "needs you" badge in the app sidebar. Jest node-env (no DOM, no
 * testing-library): the sidebar is rendered to static markup.
 */
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { leaf, splitAt } from "@/lib/terminal/layout"
import type { TermStatus } from "@/lib/terminal/status"

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, v?: Record<string, unknown>) =>
    v ? `${ns}.${key}(${Object.values(v).join(",")})` : `${ns}.${key}`,
}))
jest.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: jest.fn() }) }))
jest.mock("@/components/modeToggle", () => ({ ModeToggle: () => null }))

let mockCollapsed = false
jest.mock("@/components/shell/use-mac-chrome", () => ({
  useMacChrome: () => ({ isMac: false, isFullscreen: false, trafficLightInset: 0 }),
  useSidebarState: (sel: (s: { collapsed: boolean; toggle: () => void }) => unknown) =>
    sel({ collapsed: mockCollapsed, toggle: () => {} }),
}))

// Server rendering reads zustand's *initial* state, so feed the selector directly.
let mockStatuses: Record<string, TermStatus> = {}
jest.mock("@/store/terminal-store", () => ({
  useTerminalStore: (sel: (s: unknown) => unknown) =>
    sel({
      projects: [
        {
          id: "p", path: "/x", name: "x", collapsed: false, activeTabId: "t",
          tabs: [{ id: "t", name: "T", terminalNames: {}, layout: splitAt(leaf("a"), "a", "row", "b") }],
        },
      ],
      statuses: mockStatuses,
    }),
}))

import { AppSidebar } from "@/components/shell/app-sidebar"

const render = () => renderToStaticMarkup(<AppSidebar />)
const badges = (html: string) => [...html.matchAll(/data-sidebar-badge="[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1])

beforeEach(() => {
  mockCollapsed = false
  mockStatuses = {}
})

describe("AppSidebar terminal badge", () => {
  it("shows the waiting count on the Terminal row", () => {
    mockStatuses = { a: "waiting", b: "running" }
    const html = render()
    expect(badges(html)).toEqual(["1"])
    // DESIGN.md: badges are tinted pills, never solid saturated blocks.
    const cls = html.match(/data-sidebar-badge="count"[^>]*class="([^"]*)"/)?.[1].split(" ")
    expect(cls).toEqual(expect.arrayContaining(["bg-destructive/[0.12]", "text-destructive"]))
    expect(html).not.toContain("text-destructive-foreground")
    expect(html).toContain("Terminal.needsYou(1)")
  })

  it("renders no badge when nothing is waiting", () => {
    mockStatuses = { b: "running" }
    expect(render()).not.toContain("data-sidebar-badge")
  })

  it("rail mode shows a dot and names the count in the row label", () => {
    mockCollapsed = true
    mockStatuses = { a: "waiting", b: "waiting" }
    const html = render()
    expect(html).toContain('data-sidebar-badge="dot"')
    expect(html).toContain('aria-label="Navigation.terminal, Terminal.needsYou(2)"')
  })
})
