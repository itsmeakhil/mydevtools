"use client"
import * as React from "react"
import * as Comlink from "comlink"
import type { JsonFormatterApi } from "./json-formatter.worker"

export function useJsonFormatter() {
    const workerRef = React.useRef<Worker | null>(null)
    const apiRef = React.useRef<Comlink.Remote<JsonFormatterApi> | null>(null)

    React.useEffect(() => {
        const w = new Worker(new URL("./json-formatter.worker.ts", import.meta.url), { type: "module" })
        workerRef.current = w
        apiRef.current = Comlink.wrap<JsonFormatterApi>(w)
        return () => {
            w.terminate()
            workerRef.current = null
            apiRef.current = null
        }
    }, [])

    const format = React.useCallback(async (raw: string): Promise<{ formatted: string; ok: boolean; error?: string }> => {
        if (!apiRef.current) return { formatted: raw, ok: false, error: "worker not ready" }
        return apiRef.current.format(raw)
    }, [])

    const cancel = React.useCallback(() => {
        workerRef.current?.terminate()
        workerRef.current = null
        apiRef.current = null
    }, [])

    return { format, cancel }
}
