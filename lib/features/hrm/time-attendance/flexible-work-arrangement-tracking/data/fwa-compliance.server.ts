import "server-only"

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmFlexibleWorkArrangementType,
  hrmFlexibleWorkRequest,
  hrmFlexibleWorkSchedulePattern,
} from "#lib/db/schema"

import {
  isFwaPatternPolicyBreached,
  isFwaWeeklyMinutesBreached,
} from "../fwa-pattern-policy.shared"
import { countFwaAttendanceScheduleBreaches } from "./fwa-attendance-compliance.server"
import { listFwaSchedulePatternsForRequest } from "./fwa-attendance-compliance.server"

const ACTIVE_FWA_STATES = ["active", "approved"] as const

/**
 * Active or approved arrangements with zero schedule pattern rows (HRM-FWA-013/021).
 */
export async function countFwaActiveWithoutSchedulePattern(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmFlexibleWorkRequest.id })
    .from(hrmFlexibleWorkRequest)
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES])
      )
    )

  if (rows.length === 0) return 0

  const requestIds = rows.map((row) => row.id)

  const withPatterns = await db
    .select({
      requestId: hrmFlexibleWorkSchedulePattern.requestId,
      count: sql<number>`count(*)::int`,
    })
    .from(hrmFlexibleWorkSchedulePattern)
    .where(
      and(
        eq(hrmFlexibleWorkSchedulePattern.organizationId, organizationId),
        inArray(hrmFlexibleWorkSchedulePattern.requestId, requestIds)
      )
    )
    .groupBy(hrmFlexibleWorkSchedulePattern.requestId)

  const covered = new Set(withPatterns.map((row) => row.requestId))
  return requestIds.filter((id) => !covered.has(id)).length
}

/** Active arrangements whose type requires a remote location but none is recorded (HRM-FWA-016/021). */
export async function countFwaActiveMissingRequiredRemoteLocation(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(hrmFlexibleWorkRequest)
    .innerJoin(
      hrmFlexibleWorkArrangementType,
      eq(
        hrmFlexibleWorkRequest.arrangementTypeId,
        hrmFlexibleWorkArrangementType.id
      )
    )
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES]),
        eq(hrmFlexibleWorkArrangementType.requiresRemoteLocation, true),
        or(
          isNull(hrmFlexibleWorkRequest.remoteLocation),
          sql`trim(${hrmFlexibleWorkRequest.remoteLocation}) = ''`
        )
      )
    )

  return Number(rows[0]?.value ?? 0)
}

/** Active arrangements whose type requires evidence but no document is linked (HRM-FWA-006/021). */
export async function countFwaActiveMissingRequiredEvidence(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(hrmFlexibleWorkRequest)
    .innerJoin(
      hrmFlexibleWorkArrangementType,
      eq(
        hrmFlexibleWorkRequest.arrangementTypeId,
        hrmFlexibleWorkArrangementType.id
      )
    )
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES]),
        eq(hrmFlexibleWorkArrangementType.requiresSupportingDocument, true),
        isNull(hrmFlexibleWorkRequest.evidenceDocumentId)
      )
    )

  return Number(rows[0]?.value ?? 0)
}

/** Active arrangements breaching weekday office/remote quotas or weekly minutes (018–020). */
export async function countFwaPatternPolicyBreaches(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      arrangementKind: hrmFlexibleWorkArrangementType.arrangementKind,
      expectedWeeklyMinutes: hrmFlexibleWorkRequest.expectedWeeklyMinutes,
    })
    .from(hrmFlexibleWorkRequest)
    .innerJoin(
      hrmFlexibleWorkArrangementType,
      eq(
        hrmFlexibleWorkRequest.arrangementTypeId,
        hrmFlexibleWorkArrangementType.id
      )
    )
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES])
      )
    )
    .limit(200)

  if (rows.length === 0) return 0

  let breaches = 0
  for (const row of rows) {
    const patterns = await listFwaSchedulePatternsForRequest({
      organizationId,
      requestId: row.id,
    })
    if (patterns.length === 0) continue
    if (
      isFwaPatternPolicyBreached(row.arrangementKind, patterns) ||
      isFwaWeeklyMinutesBreached(row.expectedWeeklyMinutes, patterns)
    ) {
      breaches += 1
    }
  }
  return breaches
}

/**
 * Org-level compliance gap count for KPI surfacing (HRM-FWA-018–021, 022 partial).
 */
export async function countFwaComplianceGaps(
  organizationId: string
): Promise<number> {
  const [
    scheduleGap,
    remoteLocationGap,
    evidenceGap,
    patternPolicyGap,
    attendanceGap,
  ] = await Promise.all([
    countFwaActiveWithoutSchedulePattern(organizationId),
    countFwaActiveMissingRequiredRemoteLocation(organizationId),
    countFwaActiveMissingRequiredEvidence(organizationId),
    countFwaPatternPolicyBreaches(organizationId),
    countFwaAttendanceScheduleBreaches(organizationId),
  ])

  return (
    scheduleGap +
    remoteLocationGap +
    evidenceGap +
    patternPolicyGap +
    attendanceGap
  )
}
