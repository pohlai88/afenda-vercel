import type { HrmFwaRequestState } from "../schemas/fwa-workflow-state.shared"

/** Client-safe row shapes for flexible work UI (no server-only imports). */

export type FwaEmployeeChoiceRow = {
  id: string
  employeeNumber: string | null
  legalName: string
}

export type FwaArrangementTypeChoiceRow = {
  id: string
  code: string
  label: string
  arrangementKind: string
  requiresRemoteLocation: boolean
  requiresSupportingDocument: boolean
}

export type OrgFwaRequestRow = {
  id: string
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string | null
  arrangementTypeId: string
  arrangementTypeCode: string
  arrangementTypeLabel: string
  arrangementKind: string
  requestedAt: Date
  reason: string | null
  startDate: string
  endDate: string | null
  remoteLocation: string | null
  state: HrmFwaRequestState
  currentApprovalId: string | null
  currentApproverUserId: string | null
}

export type FwaEligibilityRuleRow = {
  id: string
  arrangementTypeId: string
  arrangementTypeLabel: string
  departmentId: string | null
  jobGradeId: string | null
  employmentType: string | null
  legalEntityCode: string | null
  countryCode: string | null
  workLocationCode: string | null
  positionId: string | null
  workerCategory: string | null
  policyGroupCode: string | null
  allowException: boolean
  isActive: boolean
}

/** Section-level query failure copy passed from the page into governed list/KPI slots. */
export type FwaListLoadError = {
  title: string
  description?: string
  variant?: "error" | "muted" | "cta" | "forbidden"
}

export type FwaOrgSummaryCounts = {
  pendingCount: number
  activeCount: number
  typesCount: number
  expiringWithin30DaysCount: number
  /** Schedule, location, and evidence policy gaps on active arrangements (HRM-FWA-018–021). */
  complianceGapCount: number
}
