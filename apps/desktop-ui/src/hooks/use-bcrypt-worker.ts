'use client';

import { useCallback, useEffect, useRef } from 'react';
import { computeBcrypt, shouldUseBcryptWorker } from '@/lib/hash-digest';
import type { BcryptWorkerRequest, BcryptWorkerResponse } from '@/workers/bcrypt.worker';

type PendingRequest = {
  resolve: (hash: string) => void;
  reject: (error: Error) => void;
};

/**
 * Bcrypt hashing that moves off the main thread for expensive round counts.
 *
 * - rounds >= BCRYPT_WORKER_MIN_ROUNDS route through a lazily-created Web
 *   Worker (terminated on unmount).
 * - Lower rounds, SSR/no-Worker environments, and a previously-failed worker
 *   fall back to the same synchronous-path computeBcrypt.
 */
export function useBcryptWorker() {
  const workerRef = useRef<Worker | null>(null);
  const workerFailedRef = useRef(false);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const nextIdRef = useRef(0);

  const getWorker = useCallback((): Worker | null => {
    if (workerFailedRef.current || typeof Worker === 'undefined') return null;
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/bcrypt.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<BcryptWorkerResponse>) => {
        const pending = pendingRef.current.get(event.data.id);
        if (!pending) return;
        pendingRef.current.delete(event.data.id);
        if ('error' in event.data) {
          pending.reject(new Error(event.data.error));
        } else {
          pending.resolve(event.data.hash);
        }
      };
      worker.onerror = () => {
        // Worker failed to load or crashed: fail everything in flight and
        // route all future calls through the main-thread fallback.
        for (const pending of pendingRef.current.values()) {
          pending.reject(new Error('bcrypt worker failed'));
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

  const hash = useCallback(
    (password: string, rounds: number): Promise<string> => {
      const worker = shouldUseBcryptWorker(rounds, typeof Worker !== 'undefined')
        ? getWorker()
        : null;
      if (!worker) return computeBcrypt(password, rounds);
      const id = nextIdRef.current++;
      return new Promise<string>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        const request: BcryptWorkerRequest = { id, password, rounds };
        worker.postMessage(request);
      });
    },
    [getWorker],
  );

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      // Reject in-flight requests before clearing so any caller still
      // awaiting `hash()` settles instead of hanging forever (mirrors the
      // onerror path above).
      for (const request of pending.values()) {
        request.reject(new Error('bcrypt worker unmounted'));
      }
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  return { hash };
}
