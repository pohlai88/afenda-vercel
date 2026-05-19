import "server-only"

import { and, eq, isNotNull, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmComplianceException,
  hrmDocument,
  hrmEmployee,
  hrmEmployeeWorkAuthorization,
  hrmPolicyAcknowledgement,
  hrmTrainingAssignment,
  hrmTrainingRecord,
} from "#lib/db/schema"

import {
  deriveDocumentComplianceStatus,
  deriveTrainingComplianceStatus,
  deriveWorkAuthorizationComplianceStatus,
  type HrmComplianceStatus,
} from "./compliance-status.shared"
import { deriveEffectiveDocumentVerificationStatus } from "../../documents-management/data/hrm-document-governance.shared"

/**
 * Full employee-level compliance posture snapshot.
 *
 * Aggregates work authorisation, document, training, policy acknowledgement,
 * and open exception signals into a single `overallStatus` and per-area counters.
 *
 * Consumed by the compliance dashboard (HRM-CMP-022), the employee detail page
 * chrome, payroll gates, and offboarding readiness checks (HRM-CMP-027).
 */
export type EmployeeComplianceSummary = {
  readonly employeeId: string
  readonly employmentStatus: string
  readonly overallStatus: HrmComplianceStatus

  // ── Work authorisation ───────────────────────────────────────────────────
  readonly workAuthorizationCount: number
  readonly workAuthorizationAtRisk: number
  readonly workAuthorizationExpired: number

  // ── Documents ────────────────────────────────────────────────────────────
  readonly documentCount: number
  readonly documentAtRisk: number
  readonly documentExpired: number
  readonly documentPendingVerification: number

  // ── Training compliance (HRM-CMP-007/013) ───────────────────────────────
  /** Total mandatory training assignments for this employee. */
  readonly mandatoryTrainingCount: number
  /** Mandatory training assignments not yet complete and past due date. */
  readonly mandatoryTrainingOverdue: number
  /** Mandatory training assignments at risk (due within 14 days or cert expiring soon). */
  readonly mandatoryTrainingAtRisk: number
  /** Mandatory training assignments whose certification has expired. */
  readonly mandatoryTrainingCertExpired: number

  // ── Policy acknowledgements (HRM-CMP-008/014) ───────────────────────────
  /**
   * Number of mandatory policy versions for which this employee has
   * a recorded acknowledgement.
   */
  readonly acknowledgedPolicyCount: number
  /**
   * Number of mandatory policy versions missing an acknowledgement.
   * Populated only when the caller supplies the `mandatoryPolicies` option;
   * defaults to 0.
   */
  readonly missingAcknowledgementCount: number

  // ── Open exceptions (HRM-CMP-017) ────────────────────────────────────────
  /** Open compliance exceptions (status: open | corrective_action_assigned | in_progress | escalated). */
  readonly openExceptionCount: number
}

function worstStatus(
  statuses: readonly HrmComplianceStatus[]
): HrmComplianceStatus {
  const priority: Record<HrmComplianceStatus, number> = {
    non_compliant: 7,
    expired: 6,
    overdue: 5,
    at_risk: 4,
    pending: 3,
    waived: 2,
    compliant: 1,
  }
  if (statuses.length === 0) return "compliant"
  return statuses.reduce((worst, next) =>
    priority[next] > priority[worst] ? next : worst
  )
}

export type GetEmployeeComplianceSummaryOptions = {
  /**
   * List of mandatory policy definitions to check acknowledgement completeness.
   * Each entry describes a required policy version the employee must have acknowledged.
   * When omitted, `missingAcknowledgementCount` is always 0. HRM-CMP-008/014.
   */
  readonly mandatoryPolicies?: ReadonlyArray<{
    readonly policyId: string
    readonly currentVersion: string
  }>
}

export async function getEmployeeComplianceSummary(
  organizationId: string,
  employeeId: string,
  options?: GetEmployeeComplianceSummaryOptions
): Promise<EmployeeComplianceSummary | null> {
  const [employee] = await db
    .select({
      id: hrmEmployee.id,
      employmentStatus: hrmEmployee.employmentStatus,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  if (!employee) return null

  const now = new Date()

  const [
    workAuthorizations,
    documents,
    mandatoryTraining,
    acknowledgedPolicies,
    openExceptions,
  ] = await Promise.all([
    // Work authorization rows
    db
      .select({
        status: hrmEmployeeWorkAuthorization.status,
        expiresAt: hrmEmployeeWorkAuthorization.expiresAt,
      })
      .from(hrmEmployeeWorkAuthorization)
      .where(
        and(
          eq(hrmEmployeeWorkAuthorization.organizationId, organizationId),
          eq(hrmEmployeeWorkAuthorization.employeeId, employeeId)
        )
      ),
    // Employee document rows
    db
      .select({
        verificationStatus: hrmDocument.verificationStatus,
        documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
        effectiveTo: hrmDocument.effectiveTo,
      })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, organizationId),
          eq(hrmDocument.employeeId, employeeId),
          isNotNull(hrmDocument.employeeId),
          eq(hrmDocument.isLatestVersion, true),
          eq(hrmDocument.documentLifecycleStatus, "active")
        )
      ),
    // Mandatory training assignments + completion record (HRM-CMP-007/013)
    db
      .select({
        assignmentState: hrmTrainingAssignment.state,
        dueAt: hrmTrainingAssignment.dueAt,
        recordCompletedAt: hrmTrainingRecord.completedAt,
        recordExpiresAt: hrmTrainingRecord.expiresAt,
      })
      .from(hrmTrainingAssignment)
      .leftJoin(
        hrmTrainingRecord,
        and(
          eq(hrmTrainingRecord.assignmentId, hrmTrainingAssignment.id),
          eq(hrmTrainingRecord.organizationId, organizationId),
          eq(hrmTrainingRecord.employeeId, employeeId)
        )
      )
      .where(
        and(
          eq(hrmTrainingAssignment.organizationId, organizationId),
          eq(hrmTrainingAssignment.employeeId, employeeId),
          eq(hrmTrainingAssignment.required, true)
        )
      ),
    // Acknowledged policies (HRM-CMP-008/014)
    db
      .select({
        policyId: hrmPolicyAcknowledgement.policyId,
        policyVersion: hrmPolicyAcknowledgement.policyVersion,
        acknowledgedAt: hrmPolicyAcknowledgement.acknowledgedAt,
      })
      .from(hrmPolicyAcknowledgement)
      .where(
        and(
          eq(hrmPolicyAcknowledgement.organizationId, organizationId),
          eq(hrmPolicyAcknowledgement.employeeId, employeeId)
        )
      ),
    // Open compliance exceptions (HRM-CMP-017)
    db
      .select({ id: hrmComplianceException.id })
      .from(hrmComplianceException)
      .where(
        and(
          eq(hrmComplianceException.organizationId, organizationId),
          eq(hrmComplianceException.employeeId, employeeId),
          isNull(hrmComplianceException.resolvedAt),
          isNull(hrmComplianceException.waivedAt)
        )
      ),
  ])

  const workStatuses = workAuthorizations.map((row) =>
    deriveWorkAuthorizationComplianceStatus({
      status: row.status,
      expiresAt: row.expiresAt,
      now,
    })
  )

  const documentStatuses = documents.map((row) =>
    deriveDocumentComplianceStatus({
      verificationStatus: deriveEffectiveDocumentVerificationStatus({
        verificationStatus: row.verificationStatus,
        documentLifecycleStatus: row.documentLifecycleStatus,
        effectiveTo: row.effectiveTo,
        now,
      }),
      effectiveTo: row.effectiveTo,
      now,
    })
  )

  const trainingStatuses = mandatoryTraining.map((row) => {
    const completedAt =
      row.recordCompletedAt ??
      (row.assignmentState === "completed" ? row.dueAt : null)
    return deriveTrainingComplianceStatus({
      completedAt,
      certificationExpiryDate: row.recordExpiresAt,
      dueDate: row.dueAt,
      now,
    })
  })

  // Policy acknowledgement gap (HRM-CMP-014)
  let missingAcknowledgementCount = 0
  if (options?.mandatoryPolicies && options.mandatoryPolicies.length > 0) {
    const ackMap = new Map(
      acknowledgedPolicies.map((a) => [a.policyId, a.policyVersion])
    )
    for (const policy of options.mandatoryPolicies) {
      const acked = ackMap.get(policy.policyId)
      if (!acked || acked !== policy.currentVersion) {
        missingAcknowledgementCount += 1
      }
    }
  }

  const statuses: HrmComplianceStatus[] = [
    ...workStatuses,
    ...documentStatuses,
    ...trainingStatuses,
  ]

  if (missingAcknowledgementCount > 0) {
    statuses.push("pending")
  }
  if (openExceptions.length > 0) {
    statuses.push("non_compliant")
  }

  return {
    employeeId: employee.id,
    employmentStatus: employee.employmentStatus,
    overallStatus: worstStatus(statuses),

    workAuthorizationCount: workAuthorizations.length,
    workAuthorizationAtRisk: workStatuses.filter((s) => s === "at_risk").length,
    workAuthorizationExpired: workStatuses.filter((s) => s === "expired")
      .length,

    documentCount: documents.length,
    documentAtRisk: documentStatuses.filter((s) => s === "at_risk").length,
    documentExpired: documentStatuses.filter((s) => s === "expired").length,
    documentPendingVerification: documentStatuses.filter((s) => s === "pending")
      .length,

    mandatoryTrainingCount: mandatoryTraining.length,
    mandatoryTrainingOverdue: trainingStatuses.filter((s) => s === "overdue")
      .length,
    mandatoryTrainingAtRisk: trainingStatuses.filter((s) => s === "at_risk")
      .length,
    mandatoryTrainingCertExpired: trainingStatuses.filter(
      (s) => s === "expired"
    ).length,

    acknowledgedPolicyCount: acknowledgedPolicies.length,
    missingAcknowledgementCount,

    openExceptionCount: openExceptions.length,
  }
}
