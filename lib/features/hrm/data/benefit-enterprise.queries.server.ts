import "server-only"

import { and, count, eq, gte, inArray, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBenefit,
  hrmBenefitEnrollment,
  hrmBenefitLifeEvent,
  hrmDependent,
  hrmEmployee,
  hrmEmploymentContract,
} from "#lib/db/schema"

import { getBenefitPlanForOrganization, listBenefitPlansForOrganization } from "./benefit.queries.server"
import {
  evaluateBenefitEligibility,
  parseBenefitEligibilityRules,
} from "./benefit-eligibility.shared"
import { toBenefitUtcDay } from "./benefit-calendar.shared"
import { buildBenefitPlanEnterpriseVersion } from "./benefit-plan-version.shared"
import { buildBenefitCensusReport } from "./benefit-reporting.shared"
import {
  projectBenefitPayrollLinesForPeriod,
  type BenefitPayrollProjectionEnrollment,
  type BenefitPayrollProjectedLine,
} from "./benefit-payroll-projection.shared"

import type { BenefitPlanEnterpriseVersion } from "./benefit-plan-version.shared"
import type {
  BenefitEligibilityResult,
  BenefitEligibilityRules,
} from "./benefit-eligibility.shared"
import type { BenefitCensusReport } from "./benefit-reporting.shared"

export type EvaluateBenefitEligibilityForEmployeeOptions = {
  readonly organizationId: string
  readonly employeeId: string
  readonly planId: string
  readonly asOf?: string | Date
  readonly requestedCoverageLevel?: string | null
  readonly rules?: BenefitEligibilityRules
}

export type BenefitEligibilityEvaluation = {
  readonly organizationId: string
  readonly employeeId: string
  readonly planId: string
  readonly dependentCount: number
  readonly result: BenefitEligibilityResult
}

export type BenefitPayrollProjectionQueryOptions = {
  readonly organizationId: string
  readonly periodStart: string | Date
  readonly periodEnd: string | Date
  readonly employeeId?: string
  readonly currency?: string
}

export type BuildBenefitCensusReportForOrganizationOptions = {
  readonly organizationId: string
  readonly asOf?: string | Date
}

export type ListBenefitPlanEnterpriseVersionsForOrganizationOptions = {
  readonly organizationId: string
  readonly isActive?: boolean
  readonly benefitKind?: string
  readonly limit?: number
  readonly offset?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function toDateString(value: string | Date): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

async function getDependentCount(
  organizationId: string,
  employeeId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmDependent.id) })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, organizationId),
        eq(hrmDependent.employeeId, employeeId),
        isNull(hrmDependent.archivedAt)
      )
    )
  return Number(row?.n ?? 0)
}

export async function getBenefitPlanEnterpriseVersionForOrganization(
  organizationId: string,
  planId: string
): Promise<BenefitPlanEnterpriseVersion | null> {
  const plan = await getBenefitPlanForOrganization(organizationId, planId)
  return plan ? buildBenefitPlanEnterpriseVersion(plan) : null
}

export async function listBenefitPlanEnterpriseVersionsForOrganization(
  options: ListBenefitPlanEnterpriseVersionsForOrganizationOptions
): Promise<BenefitPlanEnterpriseVersion[]> {
  const plans = await listBenefitPlansForOrganization(options.organizationId, {
    isActive: options.isActive,
    benefitKind: options.benefitKind,
    limit: options.limit,
    offset: options.offset,
  })
  return plans.map(buildBenefitPlanEnterpriseVersion)
}

export async function evaluateBenefitEligibilityForEmployee(
  options: EvaluateBenefitEligibilityForEmployeeOptions
): Promise<BenefitEligibilityEvaluation | null> {
  const asOf = options.asOf ?? new Date()
  const [plan] = await db
    .select({
      id: hrmBenefit.id,
      code: hrmBenefit.code,
      name: hrmBenefit.name,
      isActive: hrmBenefit.isActive,
      effectiveFrom: hrmBenefit.effectiveFrom,
      waitingPeriodDays: hrmBenefit.waitingPeriodDays,
      coverageLevels: hrmBenefit.coverageLevels,
      eligibilityRules: hrmBenefit.eligibilityRules,
    })
    .from(hrmBenefit)
    .where(
      and(
        eq(hrmBenefit.organizationId, options.organizationId),
        eq(hrmBenefit.id, options.planId)
      )
    )
    .limit(1)

  const [employee] = await db
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
      employmentStatus: hrmEmployee.employmentStatus,
      employmentStartDate: hrmEmployee.employmentStartDate,
      countryCode: hrmEmployee.countryCode,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, options.organizationId),
        eq(hrmEmployee.id, options.employeeId)
      )
    )
    .limit(1)

  if (!plan || !employee) return null

  const [contract] = await db
    .select({
      contractType: hrmEmploymentContract.contractType,
      effectiveFrom: hrmEmploymentContract.effectiveFrom,
      normalWorkingHoursPerWeek:
        hrmEmploymentContract.normalWorkingHoursPerWeek,
    })
    .from(hrmEmploymentContract)
    .where(
      employee.currentEmploymentContractId
        ? and(
            eq(hrmEmploymentContract.organizationId, options.organizationId),
            eq(hrmEmploymentContract.id, employee.currentEmploymentContractId)
          )
        : and(
            eq(hrmEmploymentContract.organizationId, options.organizationId),
            eq(hrmEmploymentContract.employeeId, options.employeeId),
            eq(hrmEmploymentContract.state, "active")
          )
    )
    .limit(1)

  const dependentCount = await getDependentCount(
    options.organizationId,
    options.employeeId
  )

  return {
    organizationId: options.organizationId,
    employeeId: options.employeeId,
    planId: options.planId,
    dependentCount,
    result: evaluateBenefitEligibility({
      plan,
      employee: {
        ...employee,
        activeContractType: contract?.contractType ?? null,
        activeContractEffectiveFrom: contract?.effectiveFrom ?? null,
        normalWorkingHoursPerWeek: contract?.normalWorkingHoursPerWeek ?? null,
      },
      asOf,
      requestedCoverageLevel: options.requestedCoverageLevel,
      dependentCount,
      rules:
        options.rules ?? parseBenefitEligibilityRules(plan.eligibilityRules),
    }),
  }
}

export async function listBenefitPayrollProjectionEnrollmentsForPeriod(
  options: BenefitPayrollProjectionQueryOptions
): Promise<BenefitPayrollProjectionEnrollment[]> {
  const periodStart = new Date(
    toBenefitUtcDay(options.periodStart, "periodStart")
  )
  const periodEnd = new Date(
    toBenefitUtcDay(options.periodEnd, "periodEnd") + DAY_MS - 1
  )
  const conditions = [
    eq(hrmBenefitEnrollment.organizationId, options.organizationId),
    inArray(hrmBenefitEnrollment.state, ["active", "terminated"]),
    or(
      isNull(hrmBenefitEnrollment.effectiveFrom),
      lte(hrmBenefitEnrollment.effectiveFrom, periodEnd)
    ),
    or(
      isNull(hrmBenefitEnrollment.terminatedAt),
      gte(hrmBenefitEnrollment.terminatedAt, periodStart)
    ),
  ]
  if (options.employeeId) {
    conditions.push(eq(hrmBenefitEnrollment.employeeId, options.employeeId))
  }

  const rows = await db
    .select({
      enrollmentId: hrmBenefitEnrollment.id,
      benefitId: hrmBenefitEnrollment.benefitId,
      benefitCode: hrmBenefit.code,
      benefitName: hrmBenefit.name,
      employeeId: hrmBenefitEnrollment.employeeId,
      state: hrmBenefitEnrollment.state,
      effectiveFrom: hrmBenefitEnrollment.effectiveFrom,
      enrolledAt: hrmBenefitEnrollment.enrolledAt,
      terminatedAt: hrmBenefitEnrollment.terminatedAt,
      employeeContributionAmount:
        hrmBenefitEnrollment.employeeContributionAmount,
      employerContributionAmount:
        hrmBenefitEnrollment.employerContributionAmount,
    })
    .from(hrmBenefitEnrollment)
    .innerJoin(hrmBenefit, eq(hrmBenefitEnrollment.benefitId, hrmBenefit.id))
    .where(and(...conditions))

  return rows.map((row) => ({
    ...row,
    currency: options.currency ?? "MYR",
  }))
}

export async function projectBenefitPayrollLinesForEmployeePeriod(
  options: BenefitPayrollProjectionQueryOptions & {
    readonly employeeId: string
  }
): Promise<BenefitPayrollProjectedLine[]> {
  const enrollments =
    await listBenefitPayrollProjectionEnrollmentsForPeriod(options)
  return projectBenefitPayrollLinesForPeriod({
    enrollments,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    currency: options.currency,
  })
}

export async function buildBenefitCensusReportForOrganization(
  options: BuildBenefitCensusReportForOrganizationOptions
): Promise<BenefitCensusReport> {
  const asOf = toDateString(options.asOf ?? new Date())
  const [plans, enrollments, lifeEvents, employees, payrollEnrollments] =
    await Promise.all([
      db
        .select({
          id: hrmBenefit.id,
          organizationId: hrmBenefit.organizationId,
          code: hrmBenefit.code,
          name: hrmBenefit.name,
          description: hrmBenefit.description,
          benefitKind: hrmBenefit.benefitKind,
          benefitType: hrmBenefit.benefitType,
          planYear: hrmBenefit.planYear,
          carrierName: hrmBenefit.carrierName,
          providerName: hrmBenefit.providerName,
          policyReference: hrmBenefit.policyReference,
          eligibilityRules: hrmBenefit.eligibilityRules,
          rateTableVersion: hrmBenefit.rateTableVersion,
          rateTable: hrmBenefit.rateTable,
          employerContributionType: hrmBenefit.employerContributionType,
          employerContributionValue: hrmBenefit.employerContributionValue,
          employeeContributionType: hrmBenefit.employeeContributionType,
          employeeContributionValue: hrmBenefit.employeeContributionValue,
          coverageLevels: hrmBenefit.coverageLevels,
          waitingPeriodDays: hrmBenefit.waitingPeriodDays,
          maxAnnualAmount: hrmBenefit.maxAnnualAmount,
          effectiveFrom: hrmBenefit.effectiveFrom,
          isActive: hrmBenefit.isActive,
          createdAt: hrmBenefit.createdAt,
          updatedAt: hrmBenefit.updatedAt,
        })
        .from(hrmBenefit)
        .where(eq(hrmBenefit.organizationId, options.organizationId)),
      db
        .select({
          enrollmentId: hrmBenefitEnrollment.id,
          organizationId: hrmBenefitEnrollment.organizationId,
          benefitId: hrmBenefitEnrollment.benefitId,
          benefitCode: hrmBenefit.code,
          benefitName: hrmBenefit.name,
          employeeId: hrmBenefitEnrollment.employeeId,
          employeeNumber: hrmEmployee.employeeNumber,
          employeeLegalName: hrmEmployee.legalName,
          state: hrmBenefitEnrollment.state,
          coverageLevel: hrmBenefitEnrollment.coverageLevel,
          effectiveFrom: hrmBenefitEnrollment.effectiveFrom,
          enrolledAt: hrmBenefitEnrollment.enrolledAt,
          terminatedAt: hrmBenefitEnrollment.terminatedAt,
        })
        .from(hrmBenefitEnrollment)
        .innerJoin(
          hrmBenefit,
          eq(hrmBenefitEnrollment.benefitId, hrmBenefit.id)
        )
        .innerJoin(
          hrmEmployee,
          eq(hrmBenefitEnrollment.employeeId, hrmEmployee.id)
        )
        .where(eq(hrmBenefitEnrollment.organizationId, options.organizationId)),
      db
        .select({
          id: hrmBenefitLifeEvent.id,
          organizationId: hrmBenefitLifeEvent.organizationId,
          employeeId: hrmBenefitLifeEvent.employeeId,
          employeeLegalName: hrmEmployee.legalName,
          eventType: hrmBenefitLifeEvent.eventType,
          eventDate: hrmBenefitLifeEvent.eventDate,
          notes: hrmBenefitLifeEvent.notes,
          verificationStatus: hrmBenefitLifeEvent.verificationStatus,
          verifiedByUserId: hrmBenefitLifeEvent.verifiedByUserId,
          verifiedAt: hrmBenefitLifeEvent.verifiedAt,
          verificationNote: hrmBenefitLifeEvent.verificationNote,
          documentIds: hrmBenefitLifeEvent.documentIds,
          createdAt: hrmBenefitLifeEvent.createdAt,
        })
        .from(hrmBenefitLifeEvent)
        .innerJoin(
          hrmEmployee,
          eq(hrmBenefitLifeEvent.employeeId, hrmEmployee.id)
        )
        .where(eq(hrmBenefitLifeEvent.organizationId, options.organizationId)),
      db
        .select({ id: hrmEmployee.id })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, options.organizationId),
            eq(hrmEmployee.employmentStatus, "active"),
            isNull(hrmEmployee.archivedAt)
          )
        ),
      listBenefitPayrollProjectionEnrollmentsForPeriod({
        organizationId: options.organizationId,
        periodStart: asOf,
        periodEnd: asOf,
      }),
    ])

  return buildBenefitCensusReport({
    plans,
    enrollments,
    lifeEvents: lifeEvents.map((event) => ({
      ...event,
      documentIds: Array.isArray(event.documentIds) ? event.documentIds : [],
    })),
    payrollEnrollments,
    employeeIds: employees.map((employee) => employee.id),
    asOf,
  })
}
