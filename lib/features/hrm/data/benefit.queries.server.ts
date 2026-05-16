import "server-only"

import { and, count, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBenefit,
  hrmBenefitEnrollment,
  hrmBenefitLifeEvent,
  hrmEmployee,
} from "#lib/db/schema"

import type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "./benefit-model.shared"

export type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "./benefit-model.shared"

export type ListBenefitPlansForOrgOptions = {
  readonly isActive?: boolean
  readonly benefitKind?: string
  readonly limit?: number
  readonly offset?: number
}

export async function listBenefitPlansForOrganization(
  organizationId: string,
  opts: ListBenefitPlansForOrgOptions = {}
): Promise<BenefitPlanRow[]> {
  const limit = opts.limit ?? 200
  const offset = opts.offset ?? 0

  const conditions = [eq(hrmBenefit.organizationId, organizationId)]
  if (opts.isActive !== undefined) {
    conditions.push(eq(hrmBenefit.isActive, opts.isActive))
  }
  if (opts.benefitKind) {
    conditions.push(eq(hrmBenefit.benefitKind, opts.benefitKind))
  }

  return db
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
    .where(and(...conditions))
    .orderBy(desc(hrmBenefit.updatedAt))
    .limit(limit)
    .offset(offset)
}

export async function getBenefitPlanForOrganization(
  organizationId: string,
  planId: string
): Promise<BenefitPlanRow | null> {
  const [row] = await db
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
    .where(
      and(
        eq(hrmBenefit.organizationId, organizationId),
        eq(hrmBenefit.id, planId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function listEnrollmentsForPlan(
  organizationId: string,
  planId: string
): Promise<BenefitEnrollmentListRow[]> {
  return db
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
    .innerJoin(hrmBenefit, eq(hrmBenefitEnrollment.benefitId, hrmBenefit.id))
    .innerJoin(hrmEmployee, eq(hrmBenefitEnrollment.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.benefitId, planId)
      )
    )
    .orderBy(desc(hrmBenefitEnrollment.enrolledAt))
}

export async function listEnrollmentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<BenefitEnrollmentListRow[]> {
  return db
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
    .innerJoin(hrmBenefit, eq(hrmBenefitEnrollment.benefitId, hrmBenefit.id))
    .innerJoin(hrmEmployee, eq(hrmBenefitEnrollment.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmBenefitEnrollment.enrolledAt))
}

export type ListBenefitEnrollmentsForOrgOptions = {
  readonly planId?: string
  readonly states?: readonly string[]
  readonly limit?: number
}

export async function listBenefitEnrollmentsForOrganization(
  organizationId: string,
  opts: ListBenefitEnrollmentsForOrgOptions = {}
): Promise<BenefitEnrollmentListRow[]> {
  const limit = opts.limit ?? 500
  const conditions = [eq(hrmBenefitEnrollment.organizationId, organizationId)]
  if (opts.planId) {
    conditions.push(eq(hrmBenefitEnrollment.benefitId, opts.planId))
  }
  if (opts.states && opts.states.length > 0) {
    conditions.push(inArray(hrmBenefitEnrollment.state, [...opts.states]))
  }

  return db
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
    .innerJoin(hrmBenefit, eq(hrmBenefitEnrollment.benefitId, hrmBenefit.id))
    .innerJoin(hrmEmployee, eq(hrmBenefitEnrollment.employeeId, hrmEmployee.id))
    .where(and(...conditions))
    .orderBy(desc(hrmBenefitEnrollment.enrolledAt))
    .limit(limit)
}

export async function listLifeEventsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<BenefitLifeEventRow[]> {
  const rows = await db
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
    .innerJoin(hrmEmployee, eq(hrmBenefitLifeEvent.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmBenefitLifeEvent.organizationId, organizationId),
        eq(hrmBenefitLifeEvent.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmBenefitLifeEvent.eventDate))

  return rows.map((r) => ({
    ...r,
    documentIds: Array.isArray(r.documentIds) ? r.documentIds : [],
  }))
}

export async function listLifeEventsForOrganization(
  organizationId: string,
  opts: { readonly limit?: number } = {}
): Promise<BenefitLifeEventRow[]> {
  const limit = opts.limit ?? 300
  const rows = await db
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
    .innerJoin(hrmEmployee, eq(hrmBenefitLifeEvent.employeeId, hrmEmployee.id))
    .where(eq(hrmBenefitLifeEvent.organizationId, organizationId))
    .orderBy(desc(hrmBenefitLifeEvent.eventDate))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    documentIds: Array.isArray(r.documentIds) ? r.documentIds : [],
  }))
}

export async function countPendingBenefitEnrollmentsForOrganization(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmBenefitEnrollment.id) })
    .from(hrmBenefitEnrollment)
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.state, "pending")
      )
    )

  return Number(row?.n ?? 0)
}

export async function listBenefitEnrollmentCoverageRowsForEmployeePlan(
  organizationId: string,
  employeeId: string,
  planId: string
): Promise<
  Array<{
    enrollmentId: string
    state: string
    effectiveFrom: Date | null
    enrolledAt: Date | null
    terminatedAt: Date | null
  }>
> {
  return db
    .select({
      enrollmentId: hrmBenefitEnrollment.id,
      state: hrmBenefitEnrollment.state,
      effectiveFrom: hrmBenefitEnrollment.effectiveFrom,
      enrolledAt: hrmBenefitEnrollment.enrolledAt,
      terminatedAt: hrmBenefitEnrollment.terminatedAt,
    })
    .from(hrmBenefitEnrollment)
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.employeeId, employeeId),
        eq(hrmBenefitEnrollment.benefitId, planId)
      )
    )
    .orderBy(desc(hrmBenefitEnrollment.enrolledAt))
}

export async function getBenefitEnrollmentForOrganization(
  organizationId: string,
  enrollmentId: string
): Promise<{
  id: string
  state: string
  benefitId: string
  employeeId: string
  effectiveFrom: Date | null
  enrolledAt: Date
  terminatedAt: Date | null
} | null> {
  const [row] = await db
    .select({
      id: hrmBenefitEnrollment.id,
      state: hrmBenefitEnrollment.state,
      benefitId: hrmBenefitEnrollment.benefitId,
      employeeId: hrmBenefitEnrollment.employeeId,
      effectiveFrom: hrmBenefitEnrollment.effectiveFrom,
      enrolledAt: hrmBenefitEnrollment.enrolledAt,
      terminatedAt: hrmBenefitEnrollment.terminatedAt,
    })
    .from(hrmBenefitEnrollment)
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, enrollmentId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function getBenefitLifeEventForOrganization(
  organizationId: string,
  lifeEventId: string
): Promise<{ id: string; verificationStatus: string } | null> {
  const [row] = await db
    .select({
      id: hrmBenefitLifeEvent.id,
      verificationStatus: hrmBenefitLifeEvent.verificationStatus,
    })
    .from(hrmBenefitLifeEvent)
    .where(
      and(
        eq(hrmBenefitLifeEvent.organizationId, organizationId),
        eq(hrmBenefitLifeEvent.id, lifeEventId)
      )
    )
    .limit(1)

  return row ?? null
}
