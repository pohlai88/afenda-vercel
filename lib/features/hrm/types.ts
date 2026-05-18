import type { AppShellPrimaryLeftRailBadgeTone } from "#app-shell"
import type { EmployeeRecordsFieldKey } from "./employee-management/employee-records-management/data/employee-records-field-catalog.shared"
import type { HrmAppsCapabilitySegment } from "./hrm-apps-path.shared"

/** next-intl keys under `Dashboard.Hrm.nav.*` — must match message catalog. */
export type HrmNavKey = HrmAppsCapabilitySegment

export type { HrmCapability, HrmCapabilityId } from "./constants"
export { HRM_NAV_NAMESPACE } from "./constants"

/**
 * Semantic urgency carried by every HRM rail nav badge. Re-exports the
 * shell-level tone vocabulary so callers in `lib/features/hrm/` never
 * deep-import `#app-shell` rail schema internals.
 *
 * Operators read tone (color) before number — the threshold helpers in
 * `hrm-rail-pressure.shared.ts` are the only legitimate source of
 * `attention` / `critical`. UI components must not invent new tones.
 */
export type HrmRailPressureTone = AppShellPrimaryLeftRailBadgeTone

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
 * mapper from this shape onto `AppShellPrimaryLeftRailNavItem.badge`.
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
  dateOfBirth: Date | null
  gender: string | null
  nationality: string | null
  idDocumentType: string | null
  idDocumentNumber: string | null
  address: unknown | null
  countryCode: string | null
  workStateCode: string | null
  linkedUserId: string | null
  employmentStatus: string
  employmentStartDate: Date | null
  probationEndDate: Date | null
  confirmationDate: Date | null
  updatedAt: Date
  currentDepartmentId: string | null
  currentPositionId: string | null
  currentJobGradeId: string | null
  managerEmployeeId: string | null
  dottedLineManagerId: string | null
  hrOwnerEmployeeId: string | null
  employmentType: string | null
  workerCategory: string | null
  employeeLevel: string | null
  archivedReason: string | null
  currentEmploymentContractId: string | null
}

export type EmployeePersonalProfileRow = {
  id: string
  dateOfBirth: Date | null
  gender: string | null
  nationality: string | null
  maritalStatus: string | null
  languagePreference: string | null
  primaryIdentityDocumentId: string | null
  profilePhotoBlobUrl: string | null
  profilePhotoUpdatedAt: Date | null
}

export type EmployeeContactProfileRow = {
  id: string
  workEmail: string | null
  workPhone: string | null
  personalEmail: string | null
  personalPhone: string | null
  address: Record<string, unknown> | null
  mailingAddress: Record<string, unknown> | null
}

export type EmergencyContactRow = {
  id: string
  legalName: string
  relationship: string
  phone: string
  alternatePhone: string | null
  email: string | null
  isPrimary: boolean
}

export type EmployeeIdentityDocumentRow = {
  id: string
  documentType: string
  documentNumber: string
  issuingCountry: string
  issuedAt: Date | null
  expiresAt: Date | null
  isPrimary: boolean
  verificationStatus: string
}

export type EmployeeWorkAuthorizationRow = {
  id: string
  countryCode: string
  authorizationType: string
  documentNumber: string | null
  issuedAt: Date | null
  expiresAt: Date | null
  status: string
  notes: string | null
}

export type EmployeeMasterPlacementOption = {
  id: string
  code: string
  label: string
  secondaryLabel: string | null
}

export type EmployeeMasterPlacementLabels = {
  department: EmployeeMasterPlacementOption | null
  position: EmployeeMasterPlacementOption | null
  jobGrade: EmployeeMasterPlacementOption | null
  manager: EmployeeMasterPlacementOption | null
  linkedUser: EmployeeMasterPlacementOption | null
}

export type EmployeeMasterPlacementOptions = {
  departments: EmployeeMasterPlacementOption[]
  positions: EmployeeMasterPlacementOption[]
  jobGrades: EmployeeMasterPlacementOption[]
  managers: EmployeeMasterPlacementOption[]
  linkedUsers: EmployeeMasterPlacementOption[]
}

export type EmployeeMasterCompleteness = {
  identity: boolean
  contact: boolean
  emergencyContact: boolean
  employment: boolean
  statutory: boolean
  documents: boolean
  score: number
  missingFields: string[]
  missingFieldKeys: EmployeeRecordsFieldKey[]
  payrollReady: boolean
  complianceReady: boolean
}

export type EmployeeOrgContextReference = {
  legalEntity: EmployeeMasterPlacementOption | null
  businessUnit: EmployeeMasterPlacementOption | null
  department: EmployeeMasterPlacementOption | null
  team: EmployeeMasterPlacementOption | null
  branch: EmployeeMasterPlacementOption | null
  workLocationCode: string | null
  costCenterCode: string | null
}

export type EmployeeAssignmentHistoryRow = {
  id: string
  employeeId: string
  departmentId: string | null
  departmentCode: string | null
  positionId: string | null
  positionCode: string | null
  jobGradeId: string | null
  jobGradeCode: string | null
  managerEmployeeId: string | null
  managerLabel: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  effectiveFrom: Date
  effectiveTo: Date | null
  status: string
  reason: string | null
  createdAt: Date
}

export type EmployeeEmploymentHistoryEntry =
  | {
      readonly kind: "lifecycle"
      readonly id: string
      readonly occurredAt: Date
      readonly effectiveDate: Date | null
      readonly eventKind: string
      readonly previousStatus: string | null
      readonly newStatus: string | null
      readonly reason: string | null
      readonly approvalReference: string | null
    }
  | {
      readonly kind: "assignment"
      readonly id: string
      readonly occurredAt: Date
      readonly effectiveFrom: Date
      readonly effectiveTo: Date | null
      readonly departmentCode: string | null
      readonly positionCode: string | null
      readonly jobGradeCode: string | null
      readonly managerLabel: string | null
      readonly costCenterCode: string | null
      readonly workLocationCode: string | null
      readonly reason: string | null
    }
  | {
      readonly kind: "field_change"
      readonly id: string
      readonly occurredAt: Date
      readonly effectiveDate: Date | null
      readonly fieldName: string
      readonly reason: string | null
      readonly approvalReference: string | null
    }

export type EmployeeMasterSnapshot = {
  employee: EmployeeDetailRow
  personalProfile: EmployeePersonalProfileRow | null
  contactProfile: EmployeeContactProfileRow | null
  identityDocuments: EmployeeIdentityDocumentRow[]
  workAuthorizations: EmployeeWorkAuthorizationRow[]
  emergencyContacts: EmergencyContactRow[]
  payrollProfile: PayrollProfileCurrentRow | null
  dependents: DependentRow[]
  documents: HrmDocumentSummary[]
  contracts: EmploymentContractSummary[]
  placementLabels: EmployeeMasterPlacementLabels
  placementOptions: EmployeeMasterPlacementOptions
  orgContext: EmployeeOrgContextReference
  assignmentHistory: EmployeeAssignmentHistoryRow[]
  employmentHistory: EmployeeEmploymentHistoryEntry[]
  completeness: EmployeeMasterCompleteness
}

export type DependentRow = {
  id: string
  legalName: string
  relationship: string
  dateOfBirth: Date | null
  taxDependent: boolean
  createdAt: Date
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
  verificationStatus: string
  rejectionReason: string | null
  versionNumber: number
  isMandatory: boolean
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
  /** Malaysia PCB TP1/TP3 and future statutory JSON extensions. */
  statutoryProfileExtras: unknown | null
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

export type PortalAdvanceFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        amount?: string
        installmentCount?: string
        firstPeriodEndIso?: string
        reason?: string
      }
    }

export type SignatureMutationFormState =
  | { ok: true; requestId?: string; sealed?: boolean }
  | {
      ok: false
      errors: {
        form?: string
      }
    }

export type RecruitmentMutationFormState =
  | { ok: true; id?: string }
  | {
      ok: false
      errors: {
        form?: string
        requisitionId?: string
        applicationId?: string
        interviewId?: string
        offerId?: string
        employeeNumber?: string
        stage?: string
        status?: string
        scheduledAt?: string
        compensationAmount?: string
        proposedStartDate?: string
        expiresAt?: string
      }
    }

export type PayrollProfileMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        effectiveFrom?: string
        pcbTp1?: string
        pcbTp3?: string
      }
    }

export type HrmDocumentMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        blobUrl?: string
        payloadHash?: string
        rejectionReason?: string
      }
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

export type EmployeeMasterMutationFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        employeeNumber?: string
        legalName?: string
        workEmail?: string
        personalEmail?: string
        documentType?: string
        documentNumber?: string
        authorizationType?: string
        countryCode?: string
        effectiveFrom?: string
      }
    }

export type EssAcknowledgementFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        policyId?: string
      }
    }

export type EmployeePortalAccessFormState =
  | { ok: true; portalSlug: string; status: "active" | "revoked" }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
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
  | { ok: false; errors: { form?: string } }

export type OrgStructureFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        code?: string
        name?: string
        title?: string
        departmentId?: string
        positionId?: string
        gradeId?: string
        employeeId?: string
        effectiveFrom?: string
      }
    }

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
        durationOverrideReason?: string
        requestId?: string
        evidenceDocumentId?: string
      }
    }

export type LeaveBalanceAdjustmentFormState =
  | { ok: true; balanceId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        leaveTypeId?: string
        entitlementYear?: string
        adjustmentKind?: string
        days?: string
        reason?: string
      }
    }

export type LeaveCarryForwardFormState =
  | { ok: true; processed: number }
  | {
      ok: false
      errors: {
        form?: string
        fromYear?: string
        toYear?: string
        employeeId?: string
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

export type FwaRequestMutationFormState =
  | { ok: true; requestId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        arrangementTypeId?: string
        startDate?: string
        endDate?: string
        reason?: string
        remoteLocation?: string
        evidenceDocumentId?: string
      }
    }

export type FwaApprovalFormState =
  | { ok: true; requestId: string }
  | {
      ok: false
      errors: {
        form?: string
        requestId?: string
        rejectedReason?: string
        returnedReason?: string
      }
    }

export type CreateFwaTypeFormState =
  | { ok: true; typeId: string }
  | {
      ok: false
      errors: {
        form?: string
        code?: string
        label?: string
        arrangementKind?: string
      }
    }

export type SeedFwaTypesFormState =
  | { ok: true; seeded: string[]; skipped: string[] }
  | { ok: false; errors: { form?: string } }

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
  | { ok: true; result: "skipped" | "updated" | "locked" }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        attendanceDate?: string
      }
    }

export type CreateShiftTemplateFormState =
  | { ok: true; shiftTemplateId: string }
  | {
      ok: false
      errors: {
        form?: string
        code?: string
        name?: string
        defaultStartTime?: string
        defaultEndTime?: string
        unpaidBreakMinutes?: string
        paidBreakMinutes?: string
        lateGraceMinutes?: string
        earlyOutGraceMinutes?: string
        overtimeGraceMinutes?: string
        maxContinuousClockMinutes?: string
        holidayBehavior?: string
      }
    }

export type AssignEmployeeShiftFormState =
  | {
      ok: true
      assignmentId: string
      regenerationResult: "updated" | "skipped"
    }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        attendanceDate?: string
        shiftTemplateId?: string
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
        cutoffDate?: string
        paymentDate?: string
        payrollGroupCode?: string
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
        cutoffDate?: string
        paymentDate?: string
        payrollGroupCode?: string
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
// Time reports (overtime / business trip)
// ---------------------------------------------------------------------------

export type TimeReportMutationFormState =
  | { ok: true; reportId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        reportKind?: string
        workDate?: string
        overtimeMinutes?: string
        tripStartDate?: string
        tripEndDate?: string
        destination?: string
        reason?: string
      }
    }

export type CancelTimeReportFormState =
  | { ok: true; reportId: string }
  | {
      ok: false
      errors: { form?: string; reportId?: string; cancelReason?: string }
    }

export type TimeReportApprovalFormState =
  | { ok: true; reportId: string }
  | {
      ok: false
      errors: {
        form?: string
        reportId?: string
        decisionNote?: string
        rejectedReason?: string
      }
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
        expenseFundId?: string
        duplicateOverrideReason?: string
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
      errors: {
        form?: string
        claimId?: string
        approvedAmount?: string
        rejectedReason?: string
        returnedReason?: string
        overrideReason?: string
      }
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
// Phase 5: Benefits administration
// ---------------------------------------------------------------------------

export type BenefitPlanMutationFormState =
  | { ok: true; planId: string }
  | {
      ok: false
      errors: {
        form?: string
        code?: string
        name?: string
        benefitKind?: string
        planId?: string
        benefitType?: string
        planYear?: string
        carrierName?: string
        providerName?: string
        policyReference?: string
        rateTableVersion?: string
        effectiveFrom?: string
        waitingPeriodDays?: string
        employerContributionType?: string
        employeeContributionType?: string
      }
    }

export type BenefitArchiveFormState =
  | { ok: true }
  | { ok: false; errors: { form?: string; planId?: string } }

export type BenefitEnrollFormState =
  | { ok: true; enrollmentId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        planId?: string
        coverageLevel?: string
        effectiveFrom?: string
        effectiveTo?: string
      }
    }

export type BenefitEnrollmentTransitionFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        enrollmentId?: string
        waivedReason?: string
        terminationReason?: string
        terminatedAt?: string
      }
    }

export type RecordLifeEventFormState =
  | { ok: true; lifeEventId: string }
  | {
      ok: false
      errors: {
        form?: string
        employeeId?: string
        eventType?: string
        eventDate?: string
        notes?: string
      }
    }

export type VerifyLifeEventFormState =
  | { ok: true }
  | {
      ok: false
      errors: {
        form?: string
        lifeEventId?: string
        verificationStatus?: string
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

/** Shared failure branch for compliance Server Actions (`hrmCodedActionFailure`). */
export type HrmCodedFailureFormState = {
  ok: false
  code: HrmComplianceErrorCode
  message: string
}

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
  | HrmCodedFailureFormState

/** Bulk pack generation: returns the count + every evidenceId produced. */
export type GenerateAllStatutoryPacksFormState =
  | {
      ok: true
      bulk: true
      count: number
      evidenceIds: string[]
      rulePackVersion: string
    }
  | HrmCodedFailureFormState

export type MarkEvidenceSubmittedFormState =
  | { ok: true }
  | HrmCodedFailureFormState

/**
 * Outbound bureau submission via `org_event_delivery`.
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
  | HrmCodedFailureFormState

/**
 * Manual bureau acknowledgement — operator records bureau receipt; optional
 * external reference. Transitions `submitted` → `acknowledged` (terminal).
 */
export type AcknowledgeStatutoryEvidenceFormState =
  | {
      ok: true
      evidenceId: string
      auditAction: string
      externalReference: string | null
    }
  | HrmCodedFailureFormState
