import "server-only"

import { and, eq, inArray, isNotNull, isNull, lte, gte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmploymentContract,
  hrmLifecycleEvent,
  iamAuditEvent,
} from "#lib/db/schema"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"
import { createPlannerSignalFromErpProducer } from "#features/planner/server"

import { organizationHrmEmployeePath } from "../../../constants"
import {
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import {
  PROBATION_REVIEW_DUE_AUDIT_ACTION,
  PROBATION_WATCH_BATCH_LIMIT,
  type ProbationReviewCandidate,
} from "./probation-watch.shared"

export type ProbationWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly skippedAlreadyAudited: number
  readonly candidates: readonly ProbationReviewCandidate[]
}

async function loadContractsAlreadyEmitted(
  contractIds: readonly string[]
): Promise<ReadonlySet<string>> {
  if (contractIds.length === 0) return new Set()
  const rows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, PROBATION_REVIEW_DUE_AUDIT_ACTION),
        eq(iamAuditEvent.resourceType, "hrm_employment_contract"),
        inArray(iamAuditEvent.resourceId, [...contractIds])
      )
    )
  return new Set(
    rows
      .map((r) => r.resourceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )
}

/**
 * Lists active contracts still in probation (no `confirmationDate`) whose
 * `probationEndDate` falls within the next 14 UTC calendar days (inclusive).
 */
export async function listProbationReviewCandidates(input: {
  now: Date
  batchLimit?: number
}): Promise<ProbationReviewCandidate[]> {
  const limit = input.batchLimit ?? PROBATION_WATCH_BATCH_LIMIT
  const startIso = formatUtcDateOnly(input.now)
  const endDate = isoDateOnlyToUtcDate(startIso)
  endDate.setUTCDate(endDate.getUTCDate() + 14)

  const rows = await db
    .select({
      contractId: hrmEmploymentContract.id,
      organizationId: hrmEmploymentContract.organizationId,
      employeeId: hrmEmploymentContract.employeeId,
      probationEndDate: hrmEmploymentContract.probationEndDate,
      legalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
    })
    .from(hrmEmploymentContract)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmEmploymentContract.employeeId),
        eq(hrmEmployee.organizationId, hrmEmploymentContract.organizationId)
      )
    )
    .where(
      and(
        eq(hrmEmploymentContract.state, "active"),
        isNotNull(hrmEmploymentContract.probationEndDate),
        isNull(hrmEmploymentContract.confirmationDate),
        isNull(hrmEmployee.archivedAt),
        gte(
          hrmEmploymentContract.probationEndDate,
          isoDateOnlyToUtcDate(startIso)
        ),
        lte(hrmEmploymentContract.probationEndDate, endDate)
      )
    )
    .orderBy(hrmEmploymentContract.probationEndDate)
    .limit(limit)

  return rows
    .filter(
      (row): row is typeof row & { probationEndDate: Date } =>
        row.probationEndDate instanceof Date
    )
    .map((row) => ({
      contractId: row.contractId,
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      probationEndDate: row.probationEndDate,
      legalName: row.legalName,
      employeeNumber: row.employeeNumber,
    }))
}

/**
 * Daily cron — emits `erp.hrm.contract.probation_review_due` once per contract
 * and mirrors pressure into Orbit via `createPlannerSignalFromErpProducer`.
 */
export async function runProbationWatchTick(
  input?: CronTickInput
): Promise<ProbationWatchTickSummary> {
  const now = input?.now ?? new Date()
  const candidates = await listProbationReviewCandidates({
    now,
    batchLimit: input?.batchLimit ?? PROBATION_WATCH_BATCH_LIMIT,
  })

  if (candidates.length === 0) {
    return {
      scanned: 0,
      emitted: 0,
      skippedAlreadyAudited: 0,
      candidates: [],
    }
  }

  const already = await loadContractsAlreadyEmitted(
    candidates.map((c) => c.contractId)
  )

  let emitted = 0
  let skippedAlreadyAudited = 0

  for (const c of candidates) {
    if (already.has(c.contractId)) {
      skippedAlreadyAudited += 1
      continue
    }

    try {
      const orgSlug = await getOrganizationSlugById(c.organizationId)
      if (!orgSlug) {
        continue
      }

      await writeIamAuditEvent({
        action: PROBATION_REVIEW_DUE_AUDIT_ACTION,
        organizationId: c.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm_employment_contract",
        resourceId: c.contractId,
        metadata: {
          employeeId: c.employeeId,
          probationEndDate: formatUtcDateOnly(c.probationEndDate),
        },
      })

      await db.insert(hrmLifecycleEvent).values({
        id: crypto.randomUUID(),
        organizationId: c.organizationId,
        employeeId: c.employeeId,
        kind: "probation_review_due",
        previousStatus: "probation",
        newStatus: "probation",
        effectiveDate: c.probationEndDate,
        metadata: {
          contractId: c.contractId,
          probationEndDate: formatUtcDateOnly(c.probationEndDate),
        },
        actorUserId: null,
        isEffectiveDated: true,
      })

      const endLabel = formatUtcDateOnly(c.probationEndDate)
      const href = organizationHrmEmployeePath(orgSlug, c.employeeId) as string
      const label = c.employeeNumber
        ? `${c.legalName} (${c.employeeNumber})`
        : c.legalName

      await createPlannerSignalFromErpProducer({
        organizationId: c.organizationId,
        title: `Probation ends ${endLabel}`,
        description: `Confirm or extend probation for ${label}.`,
        signalClass: "review",
        originatingSystem: "hrm.probation_watch",
        module: "hrm",
        entityType: "hrm_employment_contract",
        entityId: c.contractId,
        displayLabel: label,
        href,
        causalityReason:
          "Active employment contract has a probation end date within 14 days without a recorded confirmation date.",
        actorUserId: null,
        pressure: { urgency: 0.72, impact: 0.55 },
        auditMetadata: {
          employeeId: c.employeeId,
          probationEndDate: endLabel,
        },
      })

      emitted += 1
    } catch {
      // Best-effort tick — partial progress is visible via `emitted`.
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    skippedAlreadyAudited,
    candidates,
  }
}
