"use client";

/**
 * Local identity. There are no accounts and no sign-in — the app is offline and
 * single-user, so this resolves synchronously to one fixed user. `uid` is the
 * scoping key for per-user local storage keys, `created_by` fields and query
 * keys; keeping it constant means those keep working without a server.
 *
 * The display name and avatar are user-editable and live in local preferences
 * (see `useAppUser`), not here — `useAuth` is only about identity.
 */

export const LOCAL_UID = "local";

export interface LocalUser {
  uid: typeof LOCAL_UID;
  displayName: string | null;
  email: null;
  photoURL: string | null;
}

export interface AuthState {
  user: LocalUser;
  loading: false;
}

const LOCAL_USER: LocalUser = {
  uid: LOCAL_UID,
  displayName: null,
  email: null,
  photoURL: null,
};

const STATE: AuthState = { user: LOCAL_USER, loading: false };

/** @param _requireAuth ignored — there is nothing to require. */
const useAuth = (_requireAuth: boolean = false): AuthState => STATE;

export default useAuth;
