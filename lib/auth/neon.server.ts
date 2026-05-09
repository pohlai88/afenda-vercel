import "server-only"

import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server"

/** Alias for the concrete auth instance — imported directly to avoid the
 *  `ReturnType<typeof createNeonAuth>` instantiation cost at type-check time. */
type NeonAuthInstance = NeonAuth

function parseSessionCacheTtl(): number | undefined {
  const raw = process.env.NEON_AUTH_SESSION_CACHE_TTL?.trim()
  if (!raw) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

/** Fallback when `NEXT_PHASE` is unset but a `next build` worker imports this module. */
function isNextBuildArgvFallback(): boolean {
  if (process.env.NODE_ENV !== "production") return false
  const script = process.argv[1] ?? ""
  const cmd = process.argv[2]
  return cmd === "build" && script.includes("next")
}

function allowNeonAuthPlaceholderConfig(): boolean {
  return isNextProductionBuildPhase() || isNextBuildArgvFallback()
}

const PLACEHOLDER_NEON_AUTH_BASE_URL =
  "https://placeholder.invalid/neondb/auth" as const
const PLACEHOLDER_NEON_AUTH_COOKIE_SECRET = "x".repeat(40)

export function isNeonAuthRuntimeFullyConfigured(): boolean {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim() ?? ""
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? ""
  return baseUrl.length > 0 && secret.length > 0
}

function buildCookieOptions(): {
  secret: string
  domain?: string
  sessionDataTtl?: number
} {
  const domain = process.env.NEON_AUTH_COOKIE_DOMAIN?.trim()
  const ttl = parseSessionCacheTtl()
  return {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    ...(domain ? { domain } : {}),
    ...(ttl ? { sessionDataTtl: ttl } : {}),
  }
}

let cachedAuth: NeonAuthInstance | undefined

export function getNeonAuth(): NeonAuthInstance {
  if (cachedAuth) return cachedAuth

  let baseUrl = process.env.NEON_AUTH_BASE_URL?.trim() ?? ""
  let secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? ""

  if (!baseUrl || !secret) {
    if (!allowNeonAuthPlaceholderConfig()) {
      throw new Error(
        "Neon Auth is not configured (set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET)."
      )
    }
    baseUrl = baseUrl || PLACEHOLDER_NEON_AUTH_BASE_URL
    secret = secret || PLACEHOLDER_NEON_AUTH_COOKIE_SECRET
    process.env.NEON_AUTH_BASE_URL = baseUrl
    process.env.NEON_AUTH_COOKIE_SECRET = secret
  }

  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: buildCookieOptions(),
  })

  return cachedAuth
}

/**
 * Lazily initialized Neon Auth client. Prefer `getNeonAuth()` when explicit lifecycle is useful.
 * Property access delegates to the singleton so existing `auth.api.*` call sites stay unchanged.
 */
export const auth = new Proxy({} as NeonAuthInstance, {
  get(_target, prop, receiver) {
    const real = getNeonAuth()
    const value = Reflect.get(real, prop, receiver)
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value
  },
})
