import "server-only"

import { and, count, eq, gt } from "drizzle-orm"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

const ONE_HOUR_MS = 60 * 60 * 1000

function parseMaxInvitesPerHour(): number | null {
  const raw = process.env.ORG_INVITE_MAX_PER_HOUR?.trim()
  if (raw === undefined || raw === "") return 30
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 30
  if (n <= 0) return null
  return Math.min(n, 500)
}

function upstashEnvConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return Boolean(url && token)
}

/**
 * When **Upstash Redis** is provisioned (e.g. Vercel Marketplace → Redis), uses a
 * regional sliding-window limiter shared across all serverless instances.
 * Otherwise falls back to counting `org.member.invite` rows in `iam_audit_event`.
 *
 * @see https://github.com/upstash/redis-js#basic-usage (`UPSTASH_REDIS_REST_URL` + token; `Redis.fromEnv()`)
 * @see https://vercel.com/docs/redis
 */
async function rateLimitViaUpstash(args: {
  organizationId: string
  actorUserId: string
  max: number
}): Promise<{ ok: true } | { ok: false; error: string } | null> {
  if (!upstashEnvConfigured()) return null

  try {
    const { Ratelimit } = await import("@upstash/ratelimit")
    const { Redis } = await import("@upstash/redis")
    const redis = Redis.fromEnv()
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(args.max, "1 h"),
      prefix: "@afenda/org-invite",
      analytics: false,
    })
    const identifier = `${args.organizationId}:${args.actorUserId}`
    const { success } = await ratelimit.limit(identifier)
    if (!success) {
      return {
        ok: false,
        error: `Invitation limit reached (${args.max} per hour per organization). Try again later.`,
      }
    }
    return { ok: true }
  } catch (err) {
    logUnexpectedServerError("org_invite_rate_upstash_failed", err)
    return null
  }
}

/**
 * Counts successful `org.member.invite` audit rows in the rolling window.
 * Fallback when Upstash is not configured or errors at runtime.
 */
export async function countRecentOrgMemberInvites(args: {
  organizationId: string
  actorUserId: string
  since: Date
}): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.organizationId, args.organizationId),
        eq(iamAuditEvent.actorUserId, args.actorUserId),
        eq(iamAuditEvent.action, "org.member.invite"),
        gt(iamAuditEvent.createdAt, args.since)
      )
    )
  return Number(row?.n ?? 0)
}

async function rateLimitViaAuditTrail(args: {
  organizationId: string
  actorUserId: string
  max: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const since = new Date(Date.now() - ONE_HOUR_MS)
  const n = await countRecentOrgMemberInvites({
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    since,
  })
  if (n >= args.max) {
    return {
      ok: false,
      error: `Invitation limit reached (${args.max} per hour per organization). Try again later.`,
    }
  }
  return { ok: true }
}

export async function assertOrgInviteRateAllowed(args: {
  organizationId: string
  actorUserId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const max = parseMaxInvitesPerHour()
  if (max === null) return { ok: true }

  const upstash = await rateLimitViaUpstash({
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    max,
  })
  if (upstash !== null) {
    return upstash
  }

  return rateLimitViaAuditTrail({
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    max,
  })
}
