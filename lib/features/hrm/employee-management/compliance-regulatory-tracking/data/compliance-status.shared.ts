/**
 * HRM-CMP-015 — compliance status vocabulary for employee-facing summaries.
 */
export const HRM_COMPLIANCE_STATUSES = [
  "compliant",
  "pending",
  "at_risk",
  "overdue",
  "expired",
  "waived",
  "non_compliant",
] as const

export type HrmComplianceStatus = (typeof HRM_COMPLIANCE_STATUSES)[number]

/**
 * Exception / corrective action status values for `hrm_compliance_exception.status`.
 * HRM-CMP-017/018/019.
 */
export const HRM_COMPLIANCE_EXCEPTION_STATUSES = [
  "open",
  "corrective_action_assigned",
  "in_progress",
  "resolved",
  "waived",
  "escalated",
] as const

export type HrmComplianceExceptionStatus =
  (typeof HRM_COMPLIANCE_EXCEPTION_STATUSES)[number]

/**
 * Compliance areas for exception classification. HRM-CMP-017.
 * Matches `hrm_compliance_exception.complianceArea` column values.
 */
export const HRM_COMPLIANCE_EXCEPTION_AREAS = [
  "document",
  "work_authorization",
  "training",
  "acknowledgement",
  "filing",
  "statutory",
  "other",
] as const

export type HrmComplianceExceptionArea =
  (typeof HRM_COMPLIANCE_EXCEPTION_AREAS)[number]

/**
 * Severity levels for a new compliance exception. HRM-CMP-015/017.
 */
export const HRM_COMPLIANCE_EXCEPTION_SEVERITIES = [
  "expired",
  "overdue",
  "non_compliant",
  "missing",
  "pending",
] as const

export type HrmComplianceExceptionSeverity =
  (typeof HRM_COMPLIANCE_EXCEPTION_SEVERITIES)[number]

/**
 * Filing status values for `hrm_compliance_filing.status`. HRM-CMP-009/010.
 */
export const HRM_COMPLIANCE_FILING_STATUSES = [
  "pending",
  "submitted",
  "confirmed",
  "overdue",
  "waived",
] as const

export type HrmComplianceFilingStatus =
  (typeof HRM_COMPLIANCE_FILING_STATUSES)[number]

/**
 * Filing category values for `hrm_compliance_filing.filingCategory`. HRM-CMP-009.
 */
export const HRM_COMPLIANCE_FILING_CATEGORIES = [
  "annual_employer_return",
  "monthly_statutory_contribution",
  "employment_declaration",
  "regulatory_submission",
  "safety_declaration",
  "work_permit_renewal",
  "other",
] as const

export type HrmComplianceFilingCategory =
  (typeof HRM_COMPLIANCE_FILING_CATEGORIES)[number]

const STATUS_SET: ReadonlySet<string> = new Set(HRM_COMPLIANCE_STATUSES)

export function isHrmComplianceStatus(
  value: string | null | undefined
): value is HrmComplianceStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

// ── Derivation functions ──────────────────────────────────────────────────

export function deriveWorkAuthorizationComplianceStatus(input: {
  readonly status: string
  readonly expiresAt: Date | null
  readonly now?: Date
}): HrmComplianceStatus {
  const now = input.now ?? new Date()
  if (input.status === "revoked") return "non_compliant"
  if (input.status === "expired") return "expired"
  if (!input.expiresAt) {
    return input.status === "active" ? "compliant" : "pending"
  }
  const msUntilExpiry = input.expiresAt.getTime() - now.getTime()
  const daysUntilExpiry = msUntilExpiry / (24 * 60 * 60 * 1000)
  if (daysUntilExpiry < 0) return "expired"
  if (daysUntilExpiry <= 30) return "at_risk"
  if (input.status === "pending") return "pending"
  return "compliant"
}

export function deriveDocumentComplianceStatus(input: {
  readonly verificationStatus: string
  readonly effectiveTo: Date | null
  readonly now?: Date
}): HrmComplianceStatus {
  if (input.verificationStatus === "rejected") return "non_compliant"
  if (!input.effectiveTo) {
    return input.verificationStatus === "verified" ? "compliant" : "pending"
  }
  const now = input.now ?? new Date()
  const daysUntilExpiry =
    (input.effectiveTo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  if (daysUntilExpiry < 0) return "expired"
  if (daysUntilExpiry <= 30) return "at_risk"
  if (input.verificationStatus === "pending") return "pending"
  return "compliant"
}

/**
 * Derives compliance status for a mandatory training assignment. HRM-CMP-013.
 *
 * Logic:
 * - If the training was never assigned or scheduled → "pending"
 * - If completed and no certification expiry → "compliant"
 * - If completed with a certification expiry date in the past → "expired"
 * - If completed with a certification expiry within 30 days → "at_risk"
 * - If the scheduled due date has passed and not completed → "overdue"
 * - If the due date is within 14 days and not completed → "at_risk"
 * - Otherwise → "pending"
 */
export function deriveTrainingComplianceStatus(input: {
  readonly completedAt: Date | null
  readonly certificationExpiryDate: Date | null
  readonly dueDate: Date | null
  readonly now?: Date
}): HrmComplianceStatus {
  const now = input.now ?? new Date()

  if (input.completedAt) {
    if (!input.certificationExpiryDate) return "compliant"
    const daysToExpiry =
      (input.certificationExpiryDate.getTime() - now.getTime()) /
      (24 * 60 * 60 * 1000)
    if (daysToExpiry < 0) return "expired"
    if (daysToExpiry <= 30) return "at_risk"
    return "compliant"
  }

  if (!input.dueDate) return "pending"
  const daysUntilDue =
    (input.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= 14) return "at_risk"
  return "pending"
}

/**
 * Derives compliance status for a mandatory policy acknowledgement requirement.
 * HRM-CMP-008/014.
 *
 * Logic:
 * - If acknowledged and still within the policy version validity → "compliant"
 * - If a newer policy version exists and has not been acknowledged → "pending"
 * - If the acknowledgement deadline has passed and not acknowledged → "overdue"
 * - If not yet acknowledged with a deadline within 7 days → "at_risk"
 * - Otherwise → "pending"
 */
export function deriveAcknowledgementComplianceStatus(input: {
  readonly acknowledgedAt: Date | null
  readonly acknowledgedPolicyVersion: string | null
  readonly currentPolicyVersion: string
  readonly acknowledgementDeadline: Date | null
  readonly now?: Date
}): HrmComplianceStatus {
  const now = input.now ?? new Date()

  if (
    input.acknowledgedAt &&
    input.acknowledgedPolicyVersion === input.currentPolicyVersion
  ) {
    return "compliant"
  }

  if (input.acknowledgedAt) {
    return "pending"
  }

  if (!input.acknowledgementDeadline) return "pending"

  const daysUntilDeadline =
    (input.acknowledgementDeadline.getTime() - now.getTime()) /
    (24 * 60 * 60 * 1000)
  if (daysUntilDeadline < 0) return "overdue"
  if (daysUntilDeadline <= 7) return "at_risk"
  return "pending"
}

/**
 * Derives compliance status for a mandatory filing requirement. HRM-CMP-009/010.
 *
 * Logic:
 * - If status is "confirmed" → "compliant"
 * - If status is "waived" → "waived"
 * - If status is "submitted" → "pending" (awaiting authority confirmation)
 * - If due date is in the past and not submitted → "overdue"
 * - If due date is within 14 days and not submitted → "at_risk"
 * - Otherwise → "pending"
 */
export function deriveFilingComplianceStatus(input: {
  readonly status: string
  readonly dueDate: Date
  readonly now?: Date
}): HrmComplianceStatus {
  if (input.status === "confirmed") return "compliant"
  if (input.status === "waived") return "waived"
  if (input.status === "submitted") return "pending"

  const now = input.now ?? new Date()
  const daysUntilDue =
    (input.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= 14) return "at_risk"
  return "pending"
}
