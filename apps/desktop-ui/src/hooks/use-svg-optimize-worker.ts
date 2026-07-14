'use client';

import { useCallback, useEffect, useRef } from 'react';
import { optimizeSvgMarkup, shouldUseSvgWorker } from '@/lib/svg-optimize';
import type { SvgOptimizeRequest, SvgOptimizeResponse } from '@/workers/svg-optimize.worker';

type SvgOptimizeResult = Awaited<ReturnType<typeof optimizeSvgMarkup>>;

type PendingRequest = {
  resolve: (result: SvgOptimizeResult) => void;
  reject: (error: Error) => void;
};

/**
 * SVG optimization that moves off the main thread for large documents.
 *
 * - SVGs >= SVG_WORKER_MIN_CHARS route through a lazily-created Web Worker
 *   (terminated on unmount) so svgo's parse/optimize never blocks typing.
 * - Small SVGs, SSR/no-Worker environments, and a previously-failed worker
 *   fall back to the same optimizeSvgMarkup on the main thread.
 */
export function useSvgOptimizeWorker() {
  const workerRef = useRef<Worker | null>(null);
  const workerFailedRef = useRef(false);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const nextIdRef = useRef(0);

  const getWorker = useCallback((): Worker | null => {
    if (workerFailedRef.current || typeof Worker === 'undefined') return null;
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/svg-optimize.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<SvgOptimizeResponse>) => {
        const pending = pendingRef.current.get(event.data.id);
        if (!pending) return;
        pendingRef.current.delete(event.data.id);
        const { id: _id, ...result } = event.data;
        pending.resolve(result);
      };
      worker.onerror = () => {
        // Worker failed to load or crashed: fail everything in flight and
        // route all future calls through the main-thread fallback.
        for (const pending of pendingRef.current.values()) {
          pending.reject(new Error('svg optimize worker failed'));
        }
        pendingRef.current.clear();
        worker.terminate();
        workerRef.current = null;
        workerFailedRef.current = true;
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const optimize = useCallback(
    (svg: string): Promise<SvgOptimizeResult> => {
      const worker = shouldUseSvgWorker(svg, typeof Worker !== 'undefined') ? getWorker() : null;
      if (!worker) return optimizeSvgMarkup(svg);
      const id = nextIdRef.current++;
      return new Promise<SvgOptimizeResult>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        const request: SvgOptimizeRequest = { id, svg };
        worker.postMessage(request);
      });
    },
    [getWorker],
  );

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      // Reject in-flight requests before clearing so any caller still awaiting
      // optimize() settles instead of hanging forever (mirrors onerror above).
      for (const request of pending.values()) {
        request.reject(new Error('svg optimize worker unmounted'));
      }
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  return { optimize };
}
