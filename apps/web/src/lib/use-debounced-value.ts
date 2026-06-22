import * as React from "react"

/**
 * Returns a debounced version of `value` that only updates after `ms`
 * milliseconds of inactivity.
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
    const [v, setV] = React.useState(value)
    React.useEffect(() => {
        const id = setTimeout(() => setV(value), ms)
        return () => clearTimeout(id)
    }, [value, ms])
    return v
}
