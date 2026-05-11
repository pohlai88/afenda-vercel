import type { HrmDashboardCapabilitySegment } from "#lib/hrm-dashboard.shared"

/** Minimum org role required to open a capability route (Better Auth org roles). */
export type HrmMinimumOrgRole = "member" | "admin" | "owner"

export type HrmCapabilityId =
  | "workforce"
  | "leave"
  | "attendance"
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
