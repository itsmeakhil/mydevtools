"use client"

import * as React from "react"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { RequestBody } from "./types"

export interface JsonValidationResult {
    valid: boolean
    error: string | null
}

/**
 * Debounced JSON validity check.
 * Centralises a parse that was previously called on every render in three places
 * (`api-client.tsx`, `request-tabs.tsx` × 2). Returns a stable result that only
 * recomputes after `delay` ms of idle typing.
 */
export function useJsonBodyValidation(
    body: Pick<RequestBody, "type" | "content">,
    delay = 250,
): JsonValidationResult {
    const content = body.type === "json" ? body.content : ""
    const debounced = useDebouncedValue(content, delay)

    return React.useMemo<JsonValidationResult>(() => {
        if (body.type !== "json") return { valid: true, error: null }
        if (!debounced.trim()) return { valid: true, error: null }
        try {
            JSON.parse(debounced)
            return { valid: true, error: null }
        } catch (e) {
            return { valid: false, error: (e as Error).message }
        }
    }, [debounced, body.type])
}
