import type { WorkbenchRailBadgeTone } from "#components/workbench"
import type { HrmDashboardCapabilitySegment } from "#lib/hrm-dashboard.shared"

/** Minimum org role required to open a capability route (Better Auth org roles). */
export type HrmMinimumOrgRole = "member" | "admin" | "owner"

export type HrmCapabilityId =
  | "workforce"
  | "leave"
  | "attendance"
  | "claims"
  | "payroll"
  | "compliance"
  | "documents"
  | "policies"
  | "snapshot"

/** next-intl keys under `Dashboard.Hrm.nav.*` — must match message catalog. */
export type HrmNavKey = HrmDashboardCapabilitySegment

export type HrmCapability = {
  readonly id: HrmCapabilityId
  readonly segments: readonly HrmDashboardCapabilitySegment[]
  /** Prefix for `erp.hrm.*` IAM audit actions owned by this capability (no trailing dot). */
  readonly auditPrefix: `erp.hrm.${string}`
  readonly nav: {
    readonly navKey: HrmNavKey
    readonly order: number
    readonly primarySegment: HrmDashboardCapabilitySegment
  }
  readonly minimumOrgRole: HrmMinimumOrgRole
}

export const HRM_NAV_NAMESPACE = "Dashboard.Hrm.nav" as const

/**
 * Semantic urgency carried by every HRM rail nav badge. Re-exports the
 * shell-level tone vocabulary so callers in `lib/features/hrm/` never
 * deep-import `#components/workbench/rail`.
 *
 * Operators read tone (color) before number — the threshold helpers in
 * `hrm-rail-pressure.shared.ts` are the only legitimate source of
 * `attention` / `critical`. UI components must not invent new tones.
 */
export type HrmRailPressureTone = WorkbenchRailBadgeTone

/**
 * Single nav badge payload. `count` is the integer surfaced in the UI
 * when present; `tone` is the semantic urgency operators read first. A
 * null entry in `HrmRailPressureMap` means the nav item has no pressure
 * — the badge hides entirely (conditional density).
 */
export type HrmRailPressureBadge = {
  readonly count: number
  readonly tone: HrmRailPressureTone
}

/**
 * Per-nav-key pressure map produced by `getHrmRailPressureCounts`.
 * Sparse by design — empty slots hide. The rail-slot builder is a pure
 * mapper from this shape onto `WorkbenchRailNavItem.badge`.
 *
 * Keyed by `HrmNavKey` (e.g. `leave`, `payroll`, `compliance`); other
 * keys are absent unless wired in a later phase.
 */
export type HrmRailPressureMap = Partial<
  Record<HrmNavKey, HrmRailPressureBadge>
>

export type EmployeeRow = {
  id: string
  employeeNumber: string
  legalName: string
  preferredName: string | null
  email: string | null
  archivedAt: Date | null
}

export type EmployeeDetailRow = EmployeeRow & {
  phone: string | null
  updatedAt: Date
  currentDepartmentId: string | null
  currentPositionId: string | null
  currentJobGradeId: string | null
  archivedReason: string | null
  currentEmploymentContractId: string | null
}

export type EmploymentContractSummary = {
  id: string
  versionNumber: number
  contractType: string
  state: string
  effectiveFrom: Date
  effectiveTo: Date | null
  signedDocumentId: string | null
  baseSalaryAmount: string | null
  baseSalaryCurrency: string
  payFrequency: string
}

export type HrmDocumentSummary = {
  id: string
  documentType: string
  title: string
  blobUrl: string
  payloadHash: string
  mimeType: string
  sizeBytes: number
  classification: string
  uploadedAt: Date
}

/** IAM audit rows scoped to one employee (Phase 1C timeline). */
export type EmployeeIamAuditTimelineRow = {
  id: string
  createdAt: Date
  action: string
  actorUserId: string | null
  actorEmail: string | null
  resourceType: string | null
  resourceId: string | null
  metadata: string | null
}

export type PayrollProfileCurrentRow = {
  id: string
  countryCode: string
  taxResidencyCountry: string | null
  taxIdentifierType: string | null
  taxIdentifierNumber: string | null
  epfNumber: string | null
  socsoNumber: string | null
  eisEligible: boolean
  pcbCategory: string | null
  hrdfApplicable: boolean
  bankCode: string | null
  bankAccountTokenized: string | null
  bankAccountHolderName: string | null
  paySchedule: string
  payCurrency: string
  payrollGroupCode: string | null
  effectiveFrom: Date
}

export type ContractMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        contractId?: string
        effectiveFrom?: string
        terminationDate?: string
      }
    }

export type PayrollProfileMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: { form?: string; effectiveFrom?: string }
    }

export type HrmDocumentMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: { form?: string; blobUrl?: string; payloadHash?: string }
    }

export type EmployeeMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        employeeNumber?: string
        legalName?: string
        email?: string
        employeeId?: string
        archivedReason?: string
      }
    }

export type LeaveTypeMutationFormState =
  | { ok: true; leaveTypeId: string }
  | {
      ok: false
      errors: {
        form?: string
        leaveTypeId?: string
        code?: string
        accrualMethod?: string
        tier1Days?: string
        fixedDaysPerYear?: string
      }
    }

export type LeavePolicyMutationFormState =
  | { ok: true; leavePolicyId: string }
  | {
      ok: false
      errors: {
        form?: string
        leaveTypeId?: string
        effectiveFrom?: string
      }
    }

export type SeedLeaveTypesFormState =
  | { ok: true; seeded: string[]; skipped: string[] }
  | { ok: false; error: string }

export type LeaveRequestMutationFormState =
  | { ok: true; requestId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        leaveTypeId?: string
        startDate?: string
        endDate?: string
        durationDays?: string
        requestId?: string
      }
    }

export type CancelLeaveFormState =
  | { ok: true; requestId: string }
  | {
      ok: false
      errors: { form?: string; requestId?: string }
    }

export type LeaveApprovalFormState =
  | { ok: true; requestId: string }
  | {
      ok: false
      errors: {
        form?: string
        requestId?: string
        rejectedReason?: string
      }
    }

// ---------------------------------------------------------------------------
// Phase 2C: Attendance form states
// ---------------------------------------------------------------------------

export type AttendanceRecordFormState =
  | { ok: true; eventId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        eventType?: string
        occurredAt?: string
      }
    }

export type AttendanceCorrectionFormState =
  | { ok: true; correctionEventId: string }
  | {
      ok: false
      errors: {
        form?: string
        originalEventId?: string
        eventType?: string
        occurredAt?: string
        correctionReason?: string
      }
    }

export type RegenerateDayFormState =
  | { ok: true; result: "skipped" | "updated" }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        attendanceDate?: string
      }
    }

// ---------------------------------------------------------------------------
// Phase 3A: Payroll form states
// ---------------------------------------------------------------------------

export type PayrollPeriodCreateFormState =
  | { ok: true; periodId: string }
  | {
      ok: false
      errors: {
        form?: string
        periodStart?: string
        periodEnd?: string
        paymentDate?: string
        currency?: string
      }
    }

export type PayrollPeriodUpdateFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        periodStart?: string
        periodEnd?: string
        paymentDate?: string
        currency?: string
      }
    }

export type PreparePayrollRunsFormState =
  | { ok: true; periodId: string; runCount: number }
  | { ok: false; errors: { form?: string; periodId?: string } }

export type LockPayrollPeriodFormState =
  | { ok: true }
  | { ok: false; errors: { form?: string; periodId?: string } }

/** Payroll-period lock approval actions (`hrm_approval` rows). */
export type PayrollLockApprovalFormState =
  | { ok: true }
  | {
      ok: false
      errors: { form?: string; approvalId?: string; rejectedReason?: string }
    }

// ---------------------------------------------------------------------------
// Phase 4: Claim form states
// ---------------------------------------------------------------------------

export type SubmitClaimFormState =
  | { ok: true; claimId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        claimTypeId?: string
        claimDate?: string
        amount?: string
        currency?: string
      }
    }

export type CancelClaimFormState =
  | { ok: true; claimId: string }
  | {
      ok: false
      errors: { form?: string; claimId?: string; cancelledReason?: string }
    }

export type ClaimApprovalFormState =
  | { ok: true; claimId: string }
  | {
      ok: false
      errors: { form?: string; claimId?: string; rejectedReason?: string }
    }

export type AttachClaimEvidenceFormState =
  | { ok: true; evidenceId: string }
  | {
      ok: false
      errors: {
        form?: string
        claimId?: string
        documentId?: string
        evidenceType?: string
      }
    }

// ---------------------------------------------------------------------------
// Compliance action states
// ---------------------------------------------------------------------------

export type HrmComplianceErrorCode =
  | "validation"
  | "not_found"
  | "rule_pack_missing"
  | "no_runs"
  | "period_not_locked"
  | "permission_denied"
  | "endpoint_missing"
  | "evidence_drift"
  | "rule_pack_drift"
  | "invalid_state"
  | "delivery_failed"
  | "unknown"

/** Single-pack generation: returns the canonical evidence row + payload. */
export type GenerateStatutoryPackFormState =
  | {
      ok: true
      bulk: false
      evidenceId: string
      packType: string
      inputHash: string
      payload?: unknown
    }
  | { ok: false; code: HrmComplianceErrorCode; message: string }

/** Bulk pack generation: returns the count + every evidenceId produced. */
export type GenerateAllStatutoryPacksFormState =
  | {
      ok: true
      bulk: true
      count: number
      evidenceIds: string[]
      rulePackVersion: string
    }
  | { ok: false; code: HrmComplianceErrorCode; message: string }

export type MarkEvidenceSubmittedFormState =
  | { ok: true }
  | { ok: false; code: HrmComplianceErrorCode; message: string }

/**
 * Outbound bureau submission via `org_event_delivery` (Phase 3E).
 *
 * Success carries the resulting `org_event_delivery` id + receiver HTTP status
 * so the UI can surface a "delivered (HTTP 202)" confirmation without an extra
 * round-trip.
 */
export type SubmitStatutoryEvidenceFormState =
  | {
      ok: true
      evidenceId: string
      deliveryId: string
      eventType: string
      httpStatus: number | null
    }
  | { ok: false; code: HrmComplianceErrorCode; message: string }

/**
 * Manual bureau acknowledgement (Phase 3H) — operator records that the bureau
 * confirmed receipt (typically via emailed receipt). Captures an optional
 * external reference (bureau receipt number / case id). Closes the lifecycle
 * loop: `submitted -> acknowledged`.
 *
 * State machine guard:
 *   - Only `submitted` rows are eligible.
 *   - `acknowledged` is terminal — re-acknowledgement returns `invalid_state`.
 */
export type AcknowledgeStatutoryEvidenceFormState =
  | {
      ok: true
      evidenceId: string
      auditAction: string
      externalReference: string | null
    }
  | { ok: false; code: HrmComplianceErrorCode; message: string }
