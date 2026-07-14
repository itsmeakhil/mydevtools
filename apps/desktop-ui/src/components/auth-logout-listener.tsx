"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FORCE_LOGOUT_EVENT, logoutUser, type LogoutReason } from "@/lib/logout-user"

export function AuthLogoutListener() {
  const router = useRouter()

  React.useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<{ reason?: LogoutReason }>).detail
      const reason = detail?.reason ?? "session-expired"
      ;(async () => {
        await logoutUser(reason)
        router.replace("/login")
      })()
    }

    window.addEventListener(FORCE_LOGOUT_EVENT, handler)
    return () => window.removeEventListener(FORCE_LOGOUT_EVENT, handler)
  }, [router])

  return null
}

