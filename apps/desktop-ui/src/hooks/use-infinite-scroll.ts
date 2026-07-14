import { useEffect, useRef, useState, useCallback } from "react"

const PAGE_SIZE = 20

interface UseInfiniteScrollOptions {
    totalCount: number
    /** When this value changes the display count resets to PAGE_SIZE */
    resetKey?: string
    pageSize?: number
    /**
     * Ref to the scrollable container element.
     * Required when the scroll is inside a specific element rather than the window.
     * Pass null to use the viewport (window scroll).
     */
    scrollContainerRef?: React.RefObject<HTMLElement | null>
}

interface UseInfiniteScrollReturn {
    displayCount: number
    /** Callback ref — attach to the sentinel element at the bottom of your list */
    sentinelRef: (node: HTMLDivElement | null) => void
    hasMore: boolean
    reset: () => void
}

/**
 * Purely UI-side infinite scroll using a callback ref + IntersectionObserver.
 *
 * Uses a callback ref (not useRef) so the observer re-attaches automatically
 * whenever the sentinel DOM node changes (e.g. view mode switches).
 *
 * Usage:
 *   const { displayCount, sentinelRef, hasMore } = useInfiniteScroll({
 *       totalCount: filteredItems.length,
 *       resetKey: searchTerm,
 *       scrollContainerRef: scrollerRef,   // pass the scrollable container
 *   })
 *   const visible = filteredItems.slice(0, displayCount)
 *   // …render visible, then:
 *   <div ref={sentinelRef} />
 */
export function useInfiniteScroll({
    totalCount,
    resetKey = "",
    pageSize = PAGE_SIZE,
    scrollContainerRef,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
    const [displayCount, setDisplayCount] = useState(pageSize)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const sentinelNodeRef = useRef<HTMLDivElement | null>(null)

    // Reset when search / filter changes
    useEffect(() => {
        setDisplayCount(pageSize)
    }, [resetKey, pageSize])

    const loadMore = useCallback(() => {
        setDisplayCount((prev) => {
            if (prev >= totalCount) return prev
            return Math.min(prev + pageSize, totalCount)
        })
    }, [pageSize, totalCount])

    /** Sets up (or tears down) the observer for the given sentinel node */
    const setupObserver = useCallback(
        (node: HTMLDivElement | null) => {
            // Disconnect previous observer
            if (observerRef.current) {
                observerRef.current.disconnect()
                observerRef.current = null
            }

            if (!node) return

            const root = scrollContainerRef?.current ?? null

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore()
                    }
                },
                {
                    root,
                    // When using a container root, margin relative to the container;
                    // when using viewport (root: null) margin is relative to viewport.
                    rootMargin: "0px 0px 200px 0px",
                    threshold: 0,
                }
            )

            observer.observe(node)
            observerRef.current = observer
        },
        [loadMore, scrollContainerRef]
    )

    /** Re-wire the observer whenever loadMore or the scroll container changes */
    useEffect(() => {
        setupObserver(sentinelNodeRef.current)
    }, [setupObserver])

    /** Callback ref — called by React when the sentinel div mounts/unmounts/swaps */
    const sentinelRef = useCallback(
        (node: HTMLDivElement | null) => {
            sentinelNodeRef.current = node
            setupObserver(node)
        },
        [setupObserver]
    )

    const reset = useCallback(() => setDisplayCount(pageSize), [pageSize])

    return {
        displayCount,
        sentinelRef,
        hasMore: displayCount < totalCount,
        reset,
    }
}
