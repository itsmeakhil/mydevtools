'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  generateMockData,
  shouldUseMockDataWorker,
  type GenerateOptions,
} from '@/lib/mock-data-generator'
import type { MockDataWorkerRequest, MockDataWorkerResponse } from '@/workers/mock-data.worker'

type PendingRequest = {
  resolve: (result: string) => void
  reject: (error: Error) => void
}

/**
 * Runs generateMockData off the main thread for large row counts.
 *
 * - The worker is instantiated lazily on the first large request and
 *   terminated on unmount.
 * - Row counts <= WORKER_ROW_THRESHOLD, environments without Worker (SSR),
 *   and a previously-failed worker all fall back to synchronous generation.
 */
export function useMockDataWorker() {
  const workerRef = useRef<Worker | null>(null)
  const workerFailedRef = useRef(false)
  const pendingRef = useRef(new Map<number, PendingRequest>())
  const nextIdRef = useRef(0)

  const getWorker = useCallback((): Worker | null => {
    if (workerFailedRef.current || typeof Worker === 'undefined') return null
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/mock-data.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (event: MessageEvent<MockDataWorkerResponse>) => {
        const pending = pendingRef.current.get(event.data.id)
        if (!pending) return
        pendingRef.current.delete(event.data.id)
        if ('error' in event.data) {
          pending.reject(new Error(event.data.error))
        } else {
          pending.resolve(event.data.result)
        }
      }
      worker.onerror = () => {
        // Worker failed to load or crashed: fail everything in flight and
        // route all future calls through the synchronous fallback.
        for (const pending of pendingRef.current.values()) {
          pending.reject(new Error('mock data worker failed'))
        }
        pendingRef.current.clear()
        worker.terminate()
        workerRef.current = null
        workerFailedRef.current = true
      }
      workerRef.current = worker
    }
    return workerRef.current
  }, [])

  const generate = useCallback(
    (options: GenerateOptions): Promise<string> => {
      const worker = shouldUseMockDataWorker(options.rows, typeof Worker !== 'undefined')
        ? getWorker()
        : null
      if (!worker) {
        try {
          return Promise.resolve(generateMockData(options))
        } catch (error) {
          return Promise.reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
      const id = nextIdRef.current++
      return new Promise<string>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject })
        const request: MockDataWorkerRequest = { id, options }
        worker.postMessage(request)
      })
    },
    [getWorker],
  )

  useEffect(() => {
    const pending = pendingRef.current
    return () => {
      for (const req of pending.values()) {
        req.reject(new Error('mock data worker unmounted'))
      }
      workerRef.current?.terminate()
      workerRef.current = null
      pending.clear()
    }
  }, [])

  return { generate }
}
