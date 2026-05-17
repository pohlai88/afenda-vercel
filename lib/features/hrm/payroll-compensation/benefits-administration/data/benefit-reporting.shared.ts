import type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "./benefit-model.shared"
import type { BenefitPayrollProjectionEnrollment } from "./benefit-payroll-projection.shared"
import { toBenefitUtcDay } from "./benefit-calendar.shared"

export type BenefitCensusReport = {
  readonly asOf: string
  readonly activePlanCount: number
  readonly inactivePlanCount: number
  readonly coveredEmployeeCount: number
  readonly pendingEnrollmentCount: number
  readonly waivedEnrollmentCount: number
  readonly terminatedEnrollmentCount: number
  readonly pendingLifeEventCount: number
  readonly coverageGapEmployeeIds: readonly string[]
  readonly monthlyEmployeeContributionTotal: string
  readonly monthlyEmployerContributionTotal: string
}

export type BuildBenefitCensusReportInput = {
  readonly plans: readonly BenefitPlanRow[]
  readonly enrollments: readonly BenefitEnrollmentListRow[]
  readonly lifeEvents: readonly BenefitLifeEventRow[]
  readonly payrollEnrollments?: readonly BenefitPayrollProjectionEnrollment[]
  readonly employeeIds?: readonly string[]
  readonly asOf: string
}

function parseAmount(value: string | null): number {
  if (value === null) return 0
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Benefit report amount must be non-negative")
  }
  return parsed
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return rounded.toFixed(2)
}

function coversDate(params: {
  readonly state: string
  readonly effectiveFrom: string | Date | null
  readonly effectiveTo?: string | Date | null
  readonly enrolledAt?: string | Date | null
  readonly terminatedAt: string | Date | null
  readonly asOf: string
}): boolean {
  if (params.state !== "active" && params.state !== "suspended") return false
  const asOfDay = toBenefitUtcDay(params.asOf, "asOf")
  const start = params.effectiveFrom ?? params.enrolledAt
  if (start && toBenefitUtcDay(start, "effectiveFrom") > asOfDay) {
    return false
  }
  if (
    params.effectiveTo &&
    toBenefitUtcDay(params.effectiveTo, "effectiveTo") < asOfDay
  ) {
    return false
  }
  return (
    !params.terminatedAt ||
    toBenefitUtcDay(params.terminatedAt, "terminatedAt") >= asOfDay
  )
}

export function buildBenefitCensusReport(
  input: BuildBenefitCensusReportInput
): BenefitCensusReport {
  const activeEnrollments = input.enrollments.filter((enrollment) =>
    coversDate({
      state: enrollment.state,
      effectiveFrom: enrollment.effectiveFrom,
      effectiveTo: enrollment.effectiveTo,
      enrolledAt: enrollment.enrolledAt,
      terminatedAt: enrollment.terminatedAt,
      asOf: input.asOf,
    })
  )
  const coveredEmployeeIds = new Set(
    activeEnrollments.map((enrollment) => enrollment.employeeId)
  )
  const expectedEmployeeIds = new Set(input.employeeIds ?? [])
  const coverageGapEmployeeIds = [...expectedEmployeeIds].filter(
    (employeeId) => !coveredEmployeeIds.has(employeeId)
  )
  const payrollEnrollments = (input.payrollEnrollments ?? []).filter(
    (enrollment) =>
      coversDate({
        state: enrollment.state,
        effectiveFrom: enrollment.effectiveFrom,
        effectiveTo: enrollment.effectiveTo,
        enrolledAt: enrollment.enrolledAt,
        terminatedAt: enrollment.terminatedAt,
        asOf: input.asOf,
      })
  )

  return {
    asOf: input.asOf,
    activePlanCount: input.plans.filter((plan) => plan.isActive).length,
    inactivePlanCount: input.plans.filter((plan) => !plan.isActive).length,
    coveredEmployeeCount: coveredEmployeeIds.size,
    pendingEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "pending"
    ).length,
    waivedEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "waived"
    ).length,
    terminatedEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "terminated"
    ).length,
    pendingLifeEventCount: input.lifeEvents.filter(
      (event) => event.verificationStatus === "pending"
    ).length,
    coverageGapEmployeeIds,
    monthlyEmployeeContributionTotal: formatAmount(
      payrollEnrollments.reduce(
        (sum, enrollment) =>
          sum + parseAmount(enrollment.employeeContributionAmount),
        0
      )
    ),
    monthlyEmployerContributionTotal: formatAmount(
      payrollEnrollments.reduce(
        (sum, enrollment) =>
          sum + parseAmount(enrollment.employerContributionAmount),
        0
      )
    ),
  }
}

export type BenefitEnrollmentByPlanRow = {
  readonly benefitId: string
  readonly benefitCode: string
  readonly benefitName: string
  readonly activeCount: number
  readonly pendingCount: number
}

export function buildBenefitEnrollmentByPlanReport(
  enrollments: readonly BenefitEnrollmentListRow[]
): readonly BenefitEnrollmentByPlanRow[] {
  const map = new Map<string, BenefitEnrollmentByPlanRow>()
  for (const row of enrollments) {
    const previous = map.get(row.benefitId)
    const activeCount =
      (previous?.activeCount ?? 0) +
      (row.state === "active" || row.state === "suspended" ? 1 : 0)
    const pendingCount =
      (previous?.pendingCount ?? 0) + (row.state === "pending" ? 1 : 0)
    map.set(row.benefitId, {
      benefitId: row.benefitId,
      benefitCode: row.benefitCode,
      benefitName: row.benefitName,
      activeCount,
      pendingCount,
    })
  }
  return [...map.values()].sort((a, b) =>
    a.benefitName.localeCompare(b.benefitName)
  )
}

export type BenefitCostByLegalEntityRow = {
  readonly legalEntityCode: string
  readonly employeeContributionTotal: string
  readonly employerContributionTotal: string
  readonly enrollmentCount: number
}

export function buildBenefitCostByLegalEntityReport(params: {
  readonly enrollments: readonly BenefitEnrollmentListRow[]
  readonly payrollEnrollments: readonly BenefitPayrollProjectionEnrollment[]
  readonly legalEntityByEmployeeId: ReadonlyMap<string, string | null>
}): readonly BenefitCostByLegalEntityRow[] {
  const map = new Map<string, BenefitCostByLegalEntityRow>()
  const payrollByEnrollment = new Map(
    params.payrollEnrollments.map((row) => [row.enrollmentId, row])
  )

  for (const enrollment of params.enrollments) {
    if (enrollment.state !== "active" && enrollment.state !== "suspended") {
      continue
    }
    const entity =
      params.legalEntityByEmployeeId.get(enrollment.employeeId) ?? "unknown"
    const payroll = payrollByEnrollment.get(enrollment.enrollmentId)
    const current = map.get(entity) ?? {
      legalEntityCode: entity,
      employeeContributionTotal: "0.00",
      employerContributionTotal: "0.00",
      enrollmentCount: 0,
    }
    const employeeAmount = parseAmount(
      payroll?.employeeContributionAmount ?? null
    )
    const employerAmount = parseAmount(
      payroll?.employerContributionAmount ?? null
    )
    map.set(entity, {
      legalEntityCode: entity,
      employeeContributionTotal: formatAmount(
        parseAmount(current.employeeContributionTotal) + employeeAmount
      ),
      employerContributionTotal: formatAmount(
        parseAmount(current.employerContributionTotal) + employerAmount
      ),
      enrollmentCount: current.enrollmentCount + 1,
    })
  }

  return [...map.values()].sort((a, b) =>
    a.legalEntityCode.localeCompare(b.legalEntityCode)
  )
}

export type BenefitDeductionReconciliationRow = {
  readonly enrollmentId: string
  readonly benefitCode: string
  readonly benefitName: string
  readonly employeeId: string
  readonly projectedEmployeeAmount: string
  readonly projectedEmployerAmount: string
  readonly payrollLineCount: number
}

export type BenefitClaimReferenceSummaryRow = {
  readonly claimStatus: string
  readonly count: number
  readonly claimedAmountTotal: string
}

export function buildBenefitClaimReferenceSummaryReport(
  claims: readonly {
    claimStatus: string
    claimedAmount: string | null
  }[]
): readonly BenefitClaimReferenceSummaryRow[] {
  const map = new Map<string, { count: number; total: number }>()
  for (const claim of claims) {
    const current = map.get(claim.claimStatus) ?? { count: 0, total: 0 }
    map.set(claim.claimStatus, {
      count: current.count + 1,
      total: current.total + parseAmount(claim.claimedAmount),
    })
  }
  return [...map.entries()]
    .map(([claimStatus, value]) => ({
      claimStatus,
      count: value.count,
      claimedAmountTotal: formatAmount(value.total),
    }))
    .sort((a, b) => a.claimStatus.localeCompare(b.claimStatus))
}

export function buildBenefitDeductionReconciliationReport(params: {
  readonly payrollEnrollments: readonly BenefitPayrollProjectionEnrollment[]
  readonly payrollLineCountsByEnrollmentId: ReadonlyMap<string, number>
}): readonly BenefitDeductionReconciliationRow[] {
  return params.payrollEnrollments.map((enrollment) => ({
    enrollmentId: enrollment.enrollmentId,
    benefitCode: enrollment.benefitCode,
    benefitName: enrollment.benefitName,
    employeeId: enrollment.employeeId,
    projectedEmployeeAmount: enrollment.employeeContributionAmount ?? "0.00",
    projectedEmployerAmount: enrollment.employerContributionAmount ?? "0.00",
    payrollLineCount:
      params.payrollLineCountsByEnrollmentId.get(enrollment.enrollmentId) ?? 0,
  }))
}
