import "server-only"

import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth/audit.server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import { hrmEmployee, hrmFlexibleWorkRequest, iamAuditEvent } from "#lib/db/schema"
import { createPlannerSignalFromErpProducer } from "#features/orbit/server"

import { organizationHrmPath } from "../../../constants"
import { HRM_FWA_AUDIT } from "../fwa.contract"

export type FwaExpiryWatchSummary = {
  scanned: number
  emitted: number
  skippedAlreadyAudited: number
}

type FwaExpiryCandidate = {
  id: string
  organizationId: string
  employeeId: string
  endDate: string | null
  reviewDate: string | null
  legalName: string
  employeeNumber: string | null
}

async function loadFwaExpiryAlreadyEmitted(
  requestIds: readonly string[]
): Promise<ReadonlySet<string>> {
  if (requestIds.length === 0) return new Set()
  const rows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_FWA_AUDIT.requestExpiryWatch),
        eq(iamAuditEvent.resourceType, "hrm_flexible_work_request"),
        inArray(iamAuditEvent.resourceId, [...requestIds])
      )
    )
  return new Set(
    rows
      .map((row) => row.resourceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )
}

/**
 * Cron tick: expiry/review window + Orbit signals (HRM-FWA-028/029).
 */
export async function runFwaExpiryWatchTick(): Promise<FwaExpiryWatchSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const horizon = addDaysIso(today, 30)

  const rows = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      organizationId: hrmFlexibleWorkRequest.organizationId,
      employeeId: hrmFlexibleWorkRequest.employeeId,
      endDate: hrmFlexibleWorkRequest.endDate,
      reviewDate: hrmFlexibleWorkRequest.reviewDate,
      legalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
    })
    .from(hrmFlexibleWorkRequest)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmFlexibleWorkRequest.employeeId),
        eq(hrmEmployee.organizationId, hrmFlexibleWorkRequest.organizationId)
      )
    )
    .where(
      and(
        inArray(hrmFlexibleWorkRequest.state, ["active", "approved"]),
        or(
          and(
            sql`${hrmFlexibleWorkRequest.endDate} IS NOT NULL`,
            lte(hrmFlexibleWorkRequest.endDate, horizon),
            gte(hrmFlexibleWorkRequest.endDate, today)
          ),
          and(
            sql`${hrmFlexibleWorkRequest.reviewDate} IS NOT NULL`,
            lte(hrmFlexibleWorkRequest.reviewDate, horizon),
            gte(hrmFlexibleWorkRequest.reviewDate, today)
          )
        )
      )
    )
    .limit(500)

  const candidates: FwaExpiryCandidate[] = rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    endDate: row.endDate,
    reviewDate: row.reviewDate,
    legalName: row.legalName,
    employeeNumber: row.employeeNumber,
  }))

  if (candidates.length === 0) {
    return { scanned: 0, emitted: 0, skippedAlreadyAudited: 0 }
  }

  const already = await loadFwaExpiryAlreadyEmitted(
    candidates.map((row) => row.id)
  )

  let emitted = 0
  let skippedAlreadyAudited = 0

  for (const row of candidates) {
    if (already.has(row.id)) {
      skippedAlreadyAudited += 1
      continue
    }

    try {
      const orgSlug = await getOrganizationSlugById(row.organizationId)
      if (!orgSlug) continue

      const label = row.employeeNumber
        ? `${row.legalName} (${row.employeeNumber})`
        : row.legalName
      const dueLabel = row.endDate ?? row.reviewDate ?? today
      const href = organizationHrmPath(orgSlug, "flexible-work") as string

      await writeIamAuditEvent({
        action: HRM_FWA_AUDIT.requestExpiryWatch,
        actorUserId: null,
        actorSessionId: null,
        organizationId: row.organizationId,
        resourceType: "hrm_flexible_work_request",
        resourceId: row.id,
        metadata: {
          employeeId: row.employeeId,
          endDate: row.endDate,
          reviewDate: row.reviewDate,
          watch: "expiry-30d",
        },
      })

      await createPlannerSignalFromErpProducer({
        organizationId: row.organizationId,
        title: `Flexible work review by ${dueLabel}`,
        description: `Renew or review the flexible work arrangement for ${label}.`,
        signalClass: "review",
        originatingSystem: "hrm.fwa_expiry_watch",
        module: "hrm",
        entityType: "hrm_flexible_work_request",
        entityId: row.id,
        displayLabel: label,
        href,
        causalityReason:
          "Active flexible work arrangement has an end or review date within the next 30 days.",
        actorUserId: null,
        pressure: { urgency: 0.6, impact: 0.5 },
        auditMetadata: {
          employeeId: row.employeeId,
          endDate: row.endDate,
          reviewDate: row.reviewDate,
        },
      })

      emitted += 1
    } catch {
      // Continue other candidates — cron must not fail the whole batch.
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    skippedAlreadyAudited,
  }
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
