import type { NextRequest } from "next/server"

/** Primary Neon Auth session cookie (see `@neondatabase/auth` server constants). */
export const NEON_AUTH_SESSION_TOKEN_COOKIE = "__Secure-neon-auth.session_token"

/**
 * Presence-only check for Neon Auth session token cookie (edge proxy).
 * Avoids importing Better Auth cookie helpers.
 */
export function hasNeonAuthSessionCookie(request: NextRequest): boolean {
  const raw = request.headers.get("cookie")
  if (!raw) return false
  return raw.includes(NEON_AUTH_SESSION_TOKEN_COOKIE)
}
