import { requireBackendSession } from "@/lib/require-backend-session"
import { NextResponse } from "next/server"

export async function requireNosqlAuth(request: Request): Promise<NextResponse | null> {
  return requireBackendSession(request)
}
