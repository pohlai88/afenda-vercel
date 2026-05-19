import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefit, hrmBenefitEnrollment } from "#lib/db/schema"

import { parseBenefitEligibilityRules } from "./benefit-eligibility.shared"
import { resolveInitialBenefitEnrollmentState } from "./benefit-enrollment-state.shared"
import { evaluateBenefitEligibilityForEmployee } from "./benefit-enterprise.queries.server"
import { insertBenefitEnrollment } from "./benefit-enrollment.mutations.server"
import { getBenefitPlanForOrganization } from "./benefit.queries.server"

/**
 * Terminate active/pending benefit enrollments when employment ends (HRM-BEN-023).
 */
export async function terminateBenefitEnrollmentsForEmploymentEnd(params: {
  organizationId: string
  employeeId: string
  terminatedAt: Date
  updatedByUserId: string
}): Promise<number> {
  const result = await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "terminated",
      terminatedAt: params.terminatedAt,
      terminationReason: "employment_ended",
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, params.organizationId),
        eq(hrmBenefitEnrollment.employeeId, params.employeeId),
        inArray(hrmBenefitEnrollment.state, ["pending", "active", "suspended"])
      )
    )
    .returning({ id: hrmBenefitEnrollment.id })

  return result.length
}

/**
 * Create pending enrollments for plans flagged with `newHireAutoEnroll` (HRM-BEN-005).
 */
export async function seedNewHireBenefitEnrollments(params: {
  organizationId: string
  employeeId: string
  effectiveFrom: Date
  createdByUserId: string
}): Promise<string[]> {
  const plans = await db
    .select({
      id: hrmBenefit.id,
      coverageLevels: hrmBenefit.coverageLevels,
      eligibilityRules: hrmBenefit.eligibilityRules,
    })
    .from(hrmBenefit)
    .where(
      and(
        eq(hrmBenefit.organizationId, params.organizationId),
        eq(hrmBenefit.isActive, true)
      )
    )

  const createdIds: string[] = []

  for (const plan of plans) {
    const rules = parseBenefitEligibilityRules(plan.eligibilityRules)
    if (!rules?.newHireAutoEnroll) continue

    const offered =
      plan.coverageLevels?.filter(
        (level): level is string =>
          typeof level === "string" && level.length > 0
      ) ?? []
    const coverageLevel = offered[0] ?? "employee_only"

    const eligibility = await evaluateBenefitEligibilityForEmployee({
      organizationId: params.organizationId,
      employeeId: params.employeeId,
      planId: plan.id,
      asOf: params.effectiveFrom,
      requestedCoverageLevel: coverageLevel,
    })
    if (!eligibility?.result.eligible) continue

    const existing = await db
      .select({ id: hrmBenefitEnrollment.id })
      .from(hrmBenefitEnrollment)
      .where(
        and(
          eq(hrmBenefitEnrollment.organizationId, params.organizationId),
          eq(hrmBenefitEnrollment.benefitId, plan.id),
          eq(hrmBenefitEnrollment.employeeId, params.employeeId),
          inArray(hrmBenefitEnrollment.state, ["pending", "active"])
        )
      )
      .limit(1)
    if (existing[0]) continue

    const fullPlan = await getBenefitPlanForOrganization(
      params.organizationId,
      plan.id
    )
    if (!fullPlan) continue

    const { id } = await insertBenefitEnrollment({
      organizationId: params.organizationId,
      planId: plan.id,
      employeeId: params.employeeId,
      coverageLevel,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: null,
      plan: fullPlan,
      dependentCount: eligibility.dependentCount,
      eligibilityOverrideApprovedByUserId: null,
      eligibilityOverrideReason: null,
      createdByUserId: params.createdByUserId,
      initialState: resolveInitialBenefitEnrollmentState(
        fullPlan.eligibilityRules
      ),
    })

    createdIds.push(id)
  }

  return createdIds
}
