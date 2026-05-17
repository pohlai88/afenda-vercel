import "server-only"

import { and, desc, eq, gte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceEvidence, orgEventDelivery } from "#lib/db/schema"

import {
  BUREAU_RELIABILITY_WINDOW_DAYS,
  computeBureauReliabilitySummary,
} from "./bureau-reliability.shared"
import type { BureauReliabilitySnapshot } from "./bureau-reliability.shared"

/**
 * Phase 3N — server-side composer for the bureau operational reliability
 * card. ONE round-trip to Postgres: evidence rows over the rolling
 * window left-joined to their LATEST `org_event_delivery` row (the one
 * pinned by `submissionDeliveryId`).
 *
 * Why the latest-only delivery is enough for first cut:
 *   - Per-row reliability is "did our last attempt land?" — that's
 *     exactly what `submissionDeliveryId` points to.
 *   - Retry attempts are already accounted for inside the linked
 *     delivery's `attempts` column on the same row; we don't need a
 *     fan-out join just to count them.
 *   - Future: when product asks for "delivery attempts per bureau over
 *     time," extend the query to fetch ALL deliveries by `eventType`
 *     and reproject — the pure composer in `*.shared.ts` is already
 *     decoupled from how rows are sourced.
 *
 * Window discipline:
 *   - Caps at `MAX_RELIABILITY_ROWS` rows (defensive — orgs that ramp
 *     payroll heavily would otherwise scan thousands of historical
 *     rows). Ordered `updatedAt DESC` so the most recent rows always
 *     stay in the window.
 *   - Filters by `evidence.createdAt >= windowStart` rather than
 *     `updatedAt` so a row that was generated INSIDE the window but
 *     touched outside it stays in the denominator (operationally HR
 *     thinks of "what did we generate this month").
 */

/** Defensive ceiling on the row scan. */
export const MAX_RELIABILITY_ROWS = 500

export async function getBureauReliabilitySnapshot(
  organizationId: string,
  options: { now?: Date; windowDays?: number } = {}
): Promise<BureauReliabilitySnapshot> {
  const now = options.now ?? new Date()
  const windowDays = options.windowDays ?? BUREAU_RELIABILITY_WINDOW_DAYS
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      packType: hrmComplianceEvidence.packType,
      submissionState: hrmComplianceEvidence.submissionState,
      updatedAt: hrmComplianceEvidence.updatedAt,
      deliveryState: orgEventDelivery.state,
      deliveryDurationMs: orgEventDelivery.durationMs,
      deliveryCompletedAt: orgEventDelivery.completedAt,
    })
    .from(hrmComplianceEvidence)
    .leftJoin(
      orgEventDelivery,
      eq(hrmComplianceEvidence.submissionDeliveryId, orgEventDelivery.id)
    )
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        gte(hrmComplianceEvidence.createdAt, windowStart)
      )
    )
    .orderBy(desc(hrmComplianceEvidence.updatedAt))
    .limit(MAX_RELIABILITY_ROWS)

  return computeBureauReliabilitySummary(
    rows.map((row) => ({
      packType: row.packType,
      submissionState: row.submissionState,
      deliveryState: row.deliveryState ?? null,
      deliveryDurationMs: row.deliveryDurationMs ?? null,
      deliveryCompletedAt: row.deliveryCompletedAt ?? null,
      updatedAt: row.updatedAt,
    })),
    now,
    { windowDays }
  )
}
