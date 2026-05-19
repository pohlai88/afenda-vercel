import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth/audit.server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmFlexibleWorkArrangementType,
  hrmFlexibleWorkRequest,
  iamAuditEvent,
} from "#lib/db/schema"
import { createPlannerSignalFromErpProducer } from "#features/planner/server"

import { organizationHrmPath } from "../../../constants"
import { HRM_FWA_AUDIT } from "../fwa.contract"
import {
  isFwaPatternPolicyBreached,
  isFwaWeeklyMinutesBreached,
} from "../fwa-pattern-policy.shared"
import {
  hasFwaAttendanceScheduleBreachForRequest,
  listFwaSchedulePatternsForRequest,
} from "./fwa-attendance-compliance.server"

export type FwaComplianceWatchSummary = {
  scanned: number
  emitted: number
  skippedAlreadyAudited: number
}

const ACTIVE_FWA_STATES = ["active", "approved"] as const
const COMPLIANCE_WATCH_LIMIT = 100

async function loadFwaComplianceAlreadyEmitted(
  requestIds: readonly string[]
): Promise<ReadonlySet<string>> {
  if (requestIds.length === 0) return new Set()
  const rows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_FWA_AUDIT.complianceBreach),
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

type FwaComplianceCandidate = {
  id: string
  organizationId: string
  employeeId: string
  arrangementKind: string
  expectedWeeklyMinutes: number | null
  legalName: string
  employeeNumber: string | null
  breachKind: string
}

async function listFwaComplianceCandidates(): Promise<FwaComplianceCandidate[]> {
  const rows = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      organizationId: hrmFlexibleWorkRequest.organizationId,
      employeeId: hrmFlexibleWorkRequest.employeeId,
      arrangementKind: hrmFlexibleWorkArrangementType.arrangementKind,
      expectedWeeklyMinutes: hrmFlexibleWorkRequest.expectedWeeklyMinutes,
      requiresRemoteLocation:
        hrmFlexibleWorkArrangementType.requiresRemoteLocation,
      requiresSupportingDocument:
        hrmFlexibleWorkArrangementType.requiresSupportingDocument,
      remoteLocation: hrmFlexibleWorkRequest.remoteLocation,
      evidenceDocumentId: hrmFlexibleWorkRequest.evidenceDocumentId,
      legalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
    })
    .from(hrmFlexibleWorkRequest)
    .innerJoin(
      hrmFlexibleWorkArrangementType,
      eq(
        hrmFlexibleWorkRequest.arrangementTypeId,
        hrmFlexibleWorkArrangementType.id
      )
    )
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmFlexibleWorkRequest.employeeId),
        eq(hrmEmployee.organizationId, hrmFlexibleWorkRequest.organizationId)
      )
    )
    .where(inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES]))
    .orderBy(desc(hrmFlexibleWorkRequest.updatedAt))
    .limit(COMPLIANCE_WATCH_LIMIT)

  const candidates: FwaComplianceCandidate[] = []

  for (const row of rows) {
    const patterns = await listFwaSchedulePatternsForRequest({
      organizationId: row.organizationId,
      requestId: row.id,
    })

    if (patterns.length === 0) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "missing_schedule_pattern",
      })
      continue
    }

    if (
      row.requiresRemoteLocation &&
      (!row.remoteLocation || row.remoteLocation.trim() === "")
    ) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "missing_remote_location",
      })
      continue
    }

    if (row.requiresSupportingDocument && !row.evidenceDocumentId) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "missing_evidence",
      })
      continue
    }

    if (isFwaPatternPolicyBreached(row.arrangementKind, patterns)) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "pattern_policy",
      })
      continue
    }

    if (isFwaWeeklyMinutesBreached(row.expectedWeeklyMinutes, patterns)) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "weekly_minutes_mismatch",
      })
      continue
    }

    const attendanceBreach = await hasFwaAttendanceScheduleBreachForRequest({
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      requestId: row.id,
    })
    if (attendanceBreach) {
      candidates.push({
        id: row.id,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        arrangementKind: row.arrangementKind,
        expectedWeeklyMinutes: row.expectedWeeklyMinutes,
        legalName: row.legalName,
        employeeNumber: row.employeeNumber,
        breachKind: "attendance_schedule_mismatch",
      })
    }
  }

  return candidates
}

/**
 * Cron tick: emit compliance breach audits + Orbit signals once per request (HRM-FWA-021/032).
 */
export async function runFwaComplianceWatchTick(): Promise<FwaComplianceWatchSummary> {
  const candidates = await listFwaComplianceCandidates()

  if (candidates.length === 0) {
    return { scanned: 0, emitted: 0, skippedAlreadyAudited: 0 }
  }

  const already = await loadFwaComplianceAlreadyEmitted(
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
      const href = organizationHrmPath(orgSlug, "flexible-work") as string

      await writeIamAuditEvent({
        action: HRM_FWA_AUDIT.complianceBreach,
        actorUserId: null,
        actorSessionId: null,
        organizationId: row.organizationId,
        resourceType: "hrm_flexible_work_request",
        resourceId: row.id,
        metadata: {
          employeeId: row.employeeId,
          breachKind: row.breachKind,
          arrangementKind: row.arrangementKind,
        },
      })

      await createPlannerSignalFromErpProducer({
        organizationId: row.organizationId,
        title: "Flexible work policy breach",
        description: `Review compliance gap (${row.breachKind}) for ${label}.`,
        signalClass: "review",
        originatingSystem: "hrm.fwa_compliance_watch",
        module: "hrm",
        entityType: "hrm_flexible_work_request",
        entityId: row.id,
        displayLabel: label,
        href,
        causalityReason:
          "Active flexible work arrangement failed a schedule, location, or policy compliance check.",
        actorUserId: null,
        pressure: { urgency: 0.7, impact: 0.55 },
        auditMetadata: {
          employeeId: row.employeeId,
          breachKind: row.breachKind,
        },
      })

      emitted += 1
    } catch {
      // Continue batch.
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    skippedAlreadyAudited,
  }
}
