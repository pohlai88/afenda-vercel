import "server-only"

import { and, desc, eq, gte, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { railRecentItem } from "#lib/db/schema"

import { RAIL_RECENT_RATE_LIMIT_SECONDS } from "../constants"
import { recordRecentVisitInputSchema } from "../schemas/recent-input.schema"
import type { RecordRecentVisitInput } from "../schemas/recent-input.schema"

/**
 * Records that an operator visited a resource inside a workbench.
 *
 * **Not a Server Action.** Callers are RSC pages that invoke this
 * inside a `Promise.all` alongside other authority resolution. The
 * write is best-effort — recents are throughput data, not authority
 * change — so callers may ignore the resolved value.
 *
 * Rate limiter (per `(org, user, workbench, resourceType,
 * resourceId | href)`): if a row already exists within
 * `RAIL_RECENT_RATE_LIMIT_SECONDS`, this function is a no-op. Without
 * the limiter, a navigation burst (tab → detail → tab → detail)
 * would fan out N rows per second; with it, the table stays cheap and
 * the surfacing query still picks up the latest visit at next
 * boundary.
 *
 * **Not audited.** `iam_audit_event` is reserved for authority
 * change; recents would dwarf legitimate IAM rows. Track via OTEL
 * counters when telemetry lands (out of scope for this PR).
 *
 * **Failure mode.** Returns `{ ok: false, reason }` for either rate
 * limited (expected, not an error) or unexpected DB failures. Callers
 * MUST NOT surface the error to operators — recents going stale is
 * never operationally meaningful enough to interrupt a render.
 */
export type RecordRecentVisitResult =
  | { readonly ok: true; readonly inserted: true; readonly recentId: string }
  | {
      readonly ok: true
      readonly inserted: false
      readonly reason: "rate_limited"
    }
  | { readonly ok: false; readonly reason: "validation" | "unexpected" }

export async function recordRecentVisit(
  input: RecordRecentVisitInput
): Promise<RecordRecentVisitResult> {
  const parsed = recordRecentVisitInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, reason: "validation" }
  }
  const data = parsed.data
  const cutoff = new Date(Date.now() - RAIL_RECENT_RATE_LIMIT_SECONDS * 1000)

  try {
    // Rate-limit lookup: cheapest possible — same indexed
    // `(organizationId, userId, workbenchId, occurredAt)` lookup the
    // surfacing query uses, plus equality on resourceType +
    // resourceId. Single row read, LIMIT 1.
    //
    // Two distinct WHERE branches because Drizzle treats
    // `eq(col, undefined)` as a SQL bug (silently null on Neon HTTP),
    // not "match NULL" — the explicit `isNull(col)` is required for
    // list-level visits where `resourceId` is absent.
    const existing = await db
      .select({ id: railRecentItem.id })
      .from(railRecentItem)
      .where(
        and(
          eq(railRecentItem.organizationId, data.organizationId),
          eq(railRecentItem.userId, data.userId),
          eq(railRecentItem.workbenchId, data.workbenchId),
          eq(railRecentItem.resourceType, data.resourceType),
          data.resourceId !== undefined
            ? eq(railRecentItem.resourceId, data.resourceId)
            : isNull(railRecentItem.resourceId),
          gte(railRecentItem.occurredAt, cutoff)
        )
      )
      .orderBy(desc(railRecentItem.occurredAt))
      .limit(1)

    if (existing.length > 0) {
      return { ok: true, inserted: false, reason: "rate_limited" }
    }

    const id = crypto.randomUUID()
    await db.insert(railRecentItem).values({
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      workbenchId: data.workbenchId,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      label: data.label,
      href: data.href,
      icon: data.icon ?? null,
    })

    return { ok: true, inserted: true, recentId: id }
  } catch {
    // Best-effort: a recents write failure must never break a route
    // render. Logger / OTEL counter wiring is a follow-up; for now
    // surface a closed-set error so the caller can at least branch
    // deterministically in tests.
    return { ok: false, reason: "unexpected" }
  }
}
