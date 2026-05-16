import "server-only"

import type { NextRequest } from "next/server"

import { logUnexpectedServerError, rootLogger } from "#lib/logger.server"

const RATE_LIMIT_REQUESTS = 10
const RATE_LIMIT_WINDOW = "1 m" as const
const RATE_LIMIT_PREFIX = "@afenda/public-lynx"

function upstashEnvConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
}

function extractClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  )
}

type RatelimitClient = {
  limit: (identifier: string) => Promise<{
    success: boolean
    limit: number
    reset: number
  }>
}

let ratelimitClientPromise: Promise<RatelimitClient> | null = null
let loggedMissingUpstashInProduction = false

function warnWhenRateLimitDisabledInProduction(): void {
  if (loggedMissingUpstashInProduction) return
  if (process.env.NODE_ENV !== "production") return
  if (upstashEnvConfigured()) return
  loggedMissingUpstashInProduction = true
  rootLogger.warn(
    { event: "public_lynx_rate_limit_disabled" },
    "Public Lynx rate limiting is disabled: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
  )
}

async function getRatelimitClient(): Promise<RatelimitClient> {
  if (!ratelimitClientPromise) {
    ratelimitClientPromise = (async () => {
      const { Ratelimit } = await import("@upstash/ratelimit")
      const { Redis } = await import("@upstash/redis")
      return new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(
          RATE_LIMIT_REQUESTS,
          RATE_LIMIT_WINDOW
        ),
        prefix: RATE_LIMIT_PREFIX,
        analytics: false,
      })
    })()
  }
  return ratelimitClientPromise
}

/**
 * Returns a 429 response when the client IP exceeds the Public Lynx limit.
 * Returns `null` when the request may proceed (including fail-open when Upstash
 * is not configured or errors at runtime).
 */
export async function checkPublicLynxRateLimit(
  req: NextRequest
): Promise<Response | null> {
  if (!upstashEnvConfigured()) {
    warnWhenRateLimitDisabledInProduction()
    return null
  }

  try {
    const ratelimit = await getRatelimitClient()
    const ip = extractClientIp(req)
    const { success, limit, reset } = await ratelimit.limit(ip)

    if (!success) {
      return Response.json(
        { error: "Too many requests. Please wait before asking again." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1_000)),
          },
        }
      )
    }

    return null
  } catch (err) {
    logUnexpectedServerError("public_lynx_rate_limit_failed", err)
    return null
  }
}
