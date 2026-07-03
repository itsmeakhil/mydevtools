import { backendFetch } from "@/lib/backend-auth"

export interface UserProfileOut {
  uid: string
  onboarding_completed: boolean
}

export async function getMe(): Promise<UserProfileOut> {
  const res = await backendFetch("/api/backend/auth/me")
  if (!res.ok) throw new Error("Failed to fetch user profile")
  return res.json() as Promise<UserProfileOut>
}

export async function completeOnboarding(): Promise<void> {
  const res = await backendFetch("/api/backend/auth/onboarding/complete", {
    method: "POST",
  })
  if (!res.ok) throw new Error("Failed to complete onboarding")
}

/** Persist the role picked during onboarding on the user profile. */
export async function savePersona(persona: string): Promise<void> {
  const res = await backendFetch("/api/backend/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  })
  if (!res.ok) throw new Error("Failed to save persona")
}
