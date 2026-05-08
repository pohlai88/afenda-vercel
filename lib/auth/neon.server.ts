import "server-only"

import { createNeonAuth } from "@neondatabase/auth/next/server"

function parseSessionCacheTtl(): number | undefined {
  const raw = process.env.NEON_AUTH_SESSION_CACHE_TTL?.trim()
  if (!raw) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    ...(process.env.NEON_AUTH_COOKIE_DOMAIN?.trim()
      ? { domain: process.env.NEON_AUTH_COOKIE_DOMAIN.trim() }
      : {}),
    ...(parseSessionCacheTtl()
      ? { sessionDataTtl: parseSessionCacheTtl() }
      : {}),
  },
})
