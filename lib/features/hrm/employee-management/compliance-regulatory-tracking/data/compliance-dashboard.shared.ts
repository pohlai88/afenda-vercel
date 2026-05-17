import type { HrmComplianceStatus } from "./compliance-status.shared"

export type ComplianceDashboardRow = {
  readonly employeeId: string
  readonly employeeNumber: string
  readonly legalName: string
  readonly employmentStatus: string
  readonly departmentId: string | null
  readonly workLocationCode: string | null
  readonly legalEntityCode: string | null
  readonly employmentType: string | null
  readonly workerCategory: string | null
  readonly overallStatus: HrmComplianceStatus
  readonly workAuthorizationExpired: number
  readonly documentMissing: number
  readonly documentExpired: number
  readonly documentPendingVerification: number
  readonly trainingOverdue: number
  readonly trainingExpired: number
  readonly missingAcknowledgementCount: number
  readonly openExceptionCount: number
}

export type ComplianceDashboardFilterInput = {
  readonly overallStatus?: HrmComplianceStatus
  readonly departmentId?: string
  readonly workLocationCode?: string
  readonly legalEntityCode?: string
  readonly employmentType?: string
  readonly workerCategory?: string
  readonly employmentStatus?: string
}

const STATUS_PRIORITY: Record<HrmComplianceStatus, number> = {
  compliant: 1,
  waived: 2,
  pending: 3,
  at_risk: 4,
  overdue: 5,
  expired: 6,
  non_compliant: 7,
}

export function deriveComplianceDashboardOverallStatus(input: {
  readonly workStatuses: readonly HrmComplianceStatus[]
  readonly documentStatuses: readonly HrmComplianceStatus[]
  readonly trainingStatuses: readonly HrmComplianceStatus[]
  readonly acknowledgementStatuses: readonly HrmComplianceStatus[]
  readonly openExceptionCount: number
}): HrmComplianceStatus {
  const statuses: HrmComplianceStatus[] = [
    ...input.workStatuses,
    ...input.documentStatuses,
    ...input.trainingStatuses,
    ...input.acknowledgementStatuses,
  ]

  if (input.openExceptionCount > 0) {
    statuses.push("non_compliant")
  }

  if (statuses.length === 0) {
    return "compliant"
  }

  return statuses.reduce((worst, next) =>
    STATUS_PRIORITY[next] > STATUS_PRIORITY[worst] ? next : worst
  )
}
