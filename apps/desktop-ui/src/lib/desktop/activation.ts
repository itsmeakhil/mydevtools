/**
 * One-time desktop activation. The record is a plan snapshot captured right
 * after browser sign-in, stored in the local Rust kv store — its presence is
 * what unlocks the app. Fully offline after that; no periodic recheck.
 */
import { localApi } from "./bridge";
import { remoteApiAuthed } from "./remote";

export type ActivationRecord = {
  uid: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  plan_source: string | null;
  plan_granted_at: number | null;
  created_at: number | null;
  activated_at?: number;
};

export async function getActivation(): Promise<ActivationRecord | null> {
  const r = await localApi("GET", "/desktop/activation");
  return r.status === 200 ? (JSON.parse(r.body) as ActivationRecord) : null;
}

/** Fetch the signed-in profile and persist the activation record locally. */
export async function completeActivation(): Promise<ActivationRecord> {
  const res = await remoteApiAuthed("GET", "/api/v1/auth/me");
  if (res.status !== 200) {
    throw new Error(`Could not load your account (${res.status})`);
  }
  const me = JSON.parse(res.body) as ActivationRecord & Record<string, unknown>;
  const record: ActivationRecord = {
    uid: me.uid,
    email: me.email ?? null,
    display_name: me.display_name ?? null,
    plan: me.plan || "free",
    plan_source: me.plan_source ?? null,
    plan_granted_at: me.plan_granted_at ?? null,
    created_at: me.created_at ?? null,
  };
  const saved = await localApi("POST", "/desktop/activation", JSON.stringify(record));
  if (saved.status !== 200) {
    throw new Error(`Could not save activation (${saved.status})`);
  }
  return JSON.parse(saved.body) as ActivationRecord;
}

export async function resetActivation(): Promise<void> {
  await localApi("DELETE", "/desktop/activation");
}
