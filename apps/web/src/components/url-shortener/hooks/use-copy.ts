'use client'

import { useCallback, useState } from 'react'

export function useCopy() {
    const [copied, setCopied] = useState<string | null>(null)
    const copy = useCallback((text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key)
            setTimeout(() => setCopied(null), 2000)
        })
    }, [])
    return { copied, copy }
}
