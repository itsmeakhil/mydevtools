import * as Comlink from "comlink"

const api = {
    format(raw: string): { formatted: string; ok: boolean; error?: string } {
        try {
            return { formatted: JSON.stringify(JSON.parse(raw), null, 2), ok: true }
        } catch (e) {
            return { formatted: raw, ok: false, error: (e as Error).message }
        }
    },
}

export type JsonFormatterApi = typeof api
Comlink.expose(api)
