import "server-only"

import { and, asc, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmComplianceEvidence,
  hrmDocument,
  hrmEmployee,
} from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

import {
  daysToExpiry,
  documentExpiryTiersCrossed,
  type DocumentExpiryTier,
} from "../employee-management/documents-management/data/document-expiry-watch.shared"
import {
  claimPriorityForAge,
  documentPriorityForTier,
  leavePriorityForAge,
  mergeAndTrimPressureRows,
  type HrmPressureRowForNexus,
} from "./hrm-nexus-pressure.shared"

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Aggregate HR pressure rows for the Nexus snapshot. Compose-only:
 * every sub-query is `where(organizationId)` and degrades to an empty
 * list on a transient DB hiccup so the Nexus surface never blocks on a
 * single concern. Caller (`getNexusSnapshot`) maps + merges the result
 * into the snapshot's pressure list.
 *
 * Pressure sources (Phase 4):
 *   - Pending claim approvals — `hrm_claim` rows in `submitted` state.
 *   - Pending leave approvals — `hrm_approval` rows with
 *     `subjectKind = 'leave_request'` and `state = 'pending'`.
 *   - Documents within 30/14/7-day expiry — `hrm_document` rows whose
 *     `effectiveTo` falls inside the lookahead horizon. The tier is
 *     computed from `daysToExpiry`, not from a join on
 *     `iam_audit_event` — Nexus pressure should reflect the live
 *     truth, not whether the cron has audited it yet.
 *   - Failed statutory submissions — `hrm_compliance_evidence` rows in
 *     `failed` state.
 */
export async function listHrmHighPressureForNexus(
  organizationId: string,
  limit = 5
): Promise<HrmPressureRowForNexus[]> {
  const now = new Date()

  const [pendingClaims, pendingLeaves, expiringDocs, failedCompliance] =
    await Promise.all([
      queryPendingClaims(organizationId, limit, now),
      queryPendingLeaveApprovals(organizationId, limit, now),
      queryExpiringDocuments(organizationId, limit, now),
      queryFailedCompliance(organizationId, limit),
    ])

  const merged: HrmPressureRowForNexus[] = [
    ...pendingClaims,
    ...pendingLeaves,
    ...expiringDocs,
    ...failedCompliance,
  ]

  return mergeAndTrimPressureRows(merged, limit)
}

async function queryPendingClaims(
  organizationId: string,
  limit: number,
  now: Date
): Promise<HrmPressureRowForNexus[]> {
  try {
    const rows = await db
      .select({
        id: hrmClaim.id,
        amount: hrmClaim.amount,
        currency: hrmClaim.currency,
        description: hrmClaim.description,
        submittedAt: hrmClaim.submittedAt,
        employeeFullName: hrmEmployee.legalName,
      })
      .from(hrmClaim)
      .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmClaim.employeeId))
      .where(
        and(
          eq(hrmClaim.organizationId, organizationId),
          eq(hrmClaim.state, "submitted")
        )
      )
      .orderBy(asc(hrmClaim.submittedAt))
      .limit(limit)

    return rows.map((row) => {
      const ageMs =
        row.submittedAt instanceof Date
          ? Math.max(now.getTime() - row.submittedAt.getTime(), 0)
          : null
      return {
        kind: "claim_pending" as const,
        id: row.id,
        title: row.employeeFullName
          ? `Claim awaiting approval — ${row.employeeFullName}`
          : "Claim awaiting approval",
        description: row.description ?? `${row.currency} ${row.amount}`,
        displayPriority: claimPriorityForAge(ageMs),
        submittedAt: row.submittedAt ?? null,
        evidenceCount: 0,
      }
    })
  } catch (err) {
    logUnexpectedServerError("hrm-nexus-pressure: pending claims failed", err, {
      organizationId,
    })
    return []
  }
}

async function queryPendingLeaveApprovals(
  organizationId: string,
  limit: number,
  now: Date
): Promise<HrmPressureRowForNexus[]> {
  try {
    const rows = await db
      .select({
        id: hrmApproval.id,
        subjectId: hrmApproval.subjectId,
        requestedAt: hrmApproval.requestedAt,
        decisionNote: hrmApproval.decisionNote,
      })
      .from(hrmApproval)
      .where(
        and(
          eq(hrmApproval.organizationId, organizationId),
          eq(hrmApproval.state, "pending"),
          eq(hrmApproval.subjectKind, "leave_request")
        )
      )
      .orderBy(asc(hrmApproval.requestedAt))
      .limit(limit)

    return rows.map((row) => {
      const ageMs =
        row.requestedAt instanceof Date
          ? Math.max(now.getTime() - row.requestedAt.getTime(), 0)
          : null
      return {
        kind: "leave_pending_approval" as const,
        id: row.id,
        title: "Leave request awaiting approval",
        description: row.decisionNote ?? null,
        displayPriority: leavePriorityForAge(ageMs),
        requestedAt: row.requestedAt ?? null,
      }
    })
  } catch (err) {
    logUnexpectedServerError(
      "hrm-nexus-pressure: pending leave approvals failed",
      err,
      { organizationId }
    )
    return []
  }
}

async function queryExpiringDocuments(
  organizationId: string,
  limit: number,
  now: Date
): Promise<HrmPressureRowForNexus[]> {
  try {
    const cutoff = new Date(now.getTime() + 30 * MS_PER_DAY)
    const rows = await db
      .select({
        id: hrmDocument.id,
        title: hrmDocument.title,
        documentType: hrmDocument.documentType,
        effectiveTo: hrmDocument.effectiveTo,
        employeeId: hrmDocument.employeeId,
        employeeFullName: hrmEmployee.legalName,
      })
      .from(hrmDocument)
      .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmDocument.employeeId))
      .where(
        and(
          eq(hrmDocument.organizationId, organizationId),
          isNotNull(hrmDocument.effectiveTo),
          lte(hrmDocument.effectiveTo, cutoff),
          gte(hrmDocument.effectiveTo, sql`${now}::timestamp`)
        )
      )
      .orderBy(asc(hrmDocument.effectiveTo))
      .limit(limit)

    return rows
      .filter(
        (row): row is typeof row & { effectiveTo: Date } =>
          row.effectiveTo instanceof Date
      )
      .map((row) => {
        const remaining = daysToExpiry(now, row.effectiveTo)
        const tiers = documentExpiryTiersCrossed(remaining)
        const tier: DocumentExpiryTier =
          tiers[tiers.length - 1] ?? "warning_30d"
        return {
          kind: "document_expiring" as const,
          id: row.id,
          title: row.employeeFullName
            ? `Document expiring — ${row.employeeFullName}`
            : `Document expiring — ${row.title}`,
          description: row.title,
          displayPriority: documentPriorityForTier(tier),
          daysToExpiry: remaining,
          tier,
          documentType: row.documentType,
          employeeId: row.employeeId,
          employeeName: row.employeeFullName ?? null,
        }
      })
  } catch (err) {
    logUnexpectedServerError(
      "hrm-nexus-pressure: expiring documents failed",
      err,
      { organizationId }
    )
    return []
  }
}

async function queryFailedCompliance(
  organizationId: string,
  limit: number
): Promise<HrmPressureRowForNexus[]> {
  try {
    const rows = await db
      .select({
        id: hrmComplianceEvidence.id,
        packType: hrmComplianceEvidence.packType,
        countryCode: hrmComplianceEvidence.countryCode,
      })
      .from(hrmComplianceEvidence)
      .where(
        and(
          eq(hrmComplianceEvidence.organizationId, organizationId),
          eq(hrmComplianceEvidence.submissionState, "failed")
        )
      )
      .orderBy(desc(hrmComplianceEvidence.updatedAt))
      .limit(limit)

    return rows.map((row) => ({
      kind: "compliance_failed" as const,
      id: row.id,
      title: `Statutory submission failed — ${row.packType.toUpperCase()}`,
      description: `Bureau (${row.countryCode}) rejected the latest delivery`,
      displayPriority: "critical" as const,
      packType: row.packType,
      countryCode: row.countryCode,
    }))
  } catch (err) {
    logUnexpectedServerError(
      "hrm-nexus-pressure: failed compliance failed",
      err,
      { organizationId }
    )
    return []
  }
}
