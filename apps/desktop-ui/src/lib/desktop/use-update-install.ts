"use client";

import { useSyncExternalStore } from "react";

import type { UpdateStatus } from "@/lib/desktop/updater";

type State = {
  status: UpdateStatus | null;
  error: string | null;
  visible: boolean;
};

let state: State = { status: null, error: null, visible: false };
const subscribers = new Set<() => void>();

function set(patch: Partial<State>): void {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn());
}

/** Imperative entry point — usable from the sonner toast callback (no React tree). */
export function startUpdate(): void {
  if (state.status) return; // already running
  set({
    status: { phase: "downloading", downloaded: 0, total: null },
    error: null,
    visible: true,
  });
  void import("@/lib/desktop/updater")
    .then(({ installUpdate }) => installUpdate((s) => set({ status: s })))
    .catch((e) =>
      set({ error: e instanceof Error ? e.message : "Update failed to install" })
    );
  // On success the process relaunches — there is no resolve branch to handle.
}

export function dismissUpdate(): void {
  set({ visible: false });
}
export function reopenUpdate(): void {
  set({ visible: true });
}
export function retryUpdate(): void {
  set({ status: null, error: null });
  startUpdate();
}
export function closeUpdate(): void {
  set({ status: null, error: null, visible: false });
}

/** Test-only accessor for the module store. */
export function __getState(): State {
  return state;
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function useUpdateInstall() {
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
  return {
    ...snap,
    dismiss: dismissUpdate,
    reopen: reopenUpdate,
    retry: retryUpdate,
    close: closeUpdate,
  };
}
