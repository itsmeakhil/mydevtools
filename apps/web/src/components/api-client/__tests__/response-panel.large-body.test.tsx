/**
 * Tests for the large-body truncation logic in ResponsePanel.
 *
 * Note: @testing-library/react is not installed in this project, so we cannot
 * render ResponsePanel and assert on the amber banner in the DOM. Instead, we
 * test the pure `truncateBody` helper that encapsulates the slicing decision.
 * This gives full coverage of the threshold logic without needing a browser
 * environment.
 *
 * If @testing-library/react is ever added, replace the skipped test below with
 * a real render assertion.
 */

import { truncateBody } from "../truncate-body"

const MAX_INLINE_BYTES = 2 * 1024 * 1024 // 2MB — mirrors the constant in response-panel.tsx

describe("truncateBody", () => {
    it("returns the full string when body is under the threshold", () => {
        const body = "x".repeat(100)
        const result = truncateBody(body, MAX_INLINE_BYTES)
        expect(result.inline).toBe(body)
        expect(result.truncated).toBe(false)
    })

    it("returns the full string when body is exactly at the threshold", () => {
        const body = "x".repeat(MAX_INLINE_BYTES)
        const result = truncateBody(body, MAX_INLINE_BYTES)
        expect(result.inline).toBe(body)
        expect(result.truncated).toBe(false)
    })

    it("truncates body that exceeds the threshold and sets truncated=true", () => {
        const body = "x".repeat(MAX_INLINE_BYTES + 1)
        const result = truncateBody(body, MAX_INLINE_BYTES)
        expect(result.inline.length).toBe(MAX_INLINE_BYTES)
        expect(result.truncated).toBe(true)
    })

    it("truncated slice is the first MAX_INLINE_BYTES characters", () => {
        const body = "a".repeat(MAX_INLINE_BYTES) + "b".repeat(10)
        const result = truncateBody(body, MAX_INLINE_BYTES)
        expect(result.inline).toBe("a".repeat(MAX_INLINE_BYTES))
        expect(result.truncated).toBe(true)
    })

    it("returns empty string and truncated=false for empty body", () => {
        const result = truncateBody("", MAX_INLINE_BYTES)
        expect(result.inline).toBe("")
        expect(result.truncated).toBe(false)
    })

    it("works with a custom max parameter", () => {
        const body = "hello world"
        const result = truncateBody(body, 5)
        expect(result.inline).toBe("hello")
        expect(result.truncated).toBe(true)
    })
})

it.skip("ResponsePanel shows amber truncation banner for >2MB body (requires @testing-library/react)", () => {
    // TODO: once @testing-library/react is available, render <ResponsePanel> with
    // a >2MB body and assert the amber banner and "Download full body" button appear.
    //
    // import { render, screen } from "@testing-library/react"
    // const huge = "x".repeat(2 * 1024 * 1024 + 1)
    // render(<ResponsePanel response={{ status: 200, statusText: "OK", headers: {}, body: huge,
    //   time: 10, size: huge.length }} />)
    // expect(screen.getByText(/Showing first/)).toBeInTheDocument()
    // expect(screen.getByRole("button", { name: /Download full body/ })).toBeInTheDocument()
})
