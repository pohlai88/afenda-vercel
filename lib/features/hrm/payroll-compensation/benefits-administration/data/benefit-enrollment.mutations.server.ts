import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitEnrollment } from "#lib/db/schema"

import type { BenefitCoverageLevel } from "./benefit-helpers.shared"
import {
  resolveBenefitEnrollmentContributions,
  type BenefitContributionPlanInput,
} from "./benefit-contribution.shared"
import type { BenefitEnrollmentLifecycleState } from "./benefit-enrollment-state.shared"
import { isBenefitCoverageLevel } from "./benefit-helpers.shared"

export type InsertBenefitEnrollmentParams = {
  organizationId: string
  planId: string
  employeeId: string
  coverageLevel: string
  effectiveFrom: Date
  effectiveTo: Date | null
  plan: BenefitContributionPlanInput
  dependentCount: number
  employerContributionAmountOverride?: number
  employeeContributionAmountOverride?: number
  eligibilityOverrideApprovedByUserId: string | null
  eligibilityOverrideReason: string | null
  createdByUserId: string
  initialState?: BenefitEnrollmentLifecycleState
}

export async function insertBenefitEnrollment(
  params: InsertBenefitEnrollmentParams
): Promise<{ id: string; contributionSource: string }> {
  const coverageLevel = isBenefitCoverageLevel(params.coverageLevel)
    ? params.coverageLevel
    : "employee_only"

  const resolved = resolveBenefitEnrollmentContributions({
    plan: params.plan,
    coverageLevel,
    dependentCount: params.dependentCount,
    overrides:
      params.employerContributionAmountOverride !== undefined ||
      params.employeeContributionAmountOverride !== undefined
        ? {
            employerContributionAmount:
              params.employerContributionAmountOverride,
            employeeContributionAmount:
              params.employeeContributionAmountOverride,
          }
        : undefined,
  })

  const [row] = await db
    .insert(hrmBenefitEnrollment)
    .values({
      organizationId: params.organizationId,
      benefitId: params.planId,
      employeeId: params.employeeId,
      state: params.initialState ?? "pending",
      coverageLevel,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo,
      employerContributionAmount: resolved.employerContributionAmount,
      employeeContributionAmount: resolved.employeeContributionAmount,
      eligibilityOverrideApprovedByUserId:
        params.eligibilityOverrideApprovedByUserId,
      eligibilityOverrideReason: params.eligibilityOverrideReason,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    })
    .returning({ id: hrmBenefitEnrollment.id })

  return { id: row.id, contributionSource: resolved.source }
}

export type UpdateBenefitEnrollmentChangeParams = {
  organizationId: string
  enrollmentId: string
  coverageLevel?: BenefitCoverageLevel
  effectiveFrom?: Date
  effectiveTo?: Date | null
  employerContributionAmount: string | null
  employeeContributionAmount: string | null
  updatedByUserId: string
}

export async function updateBenefitEnrollmentChange(
  params: UpdateBenefitEnrollmentChangeParams
): Promise<void> {
  const patch: Record<string, unknown> = {
    employerContributionAmount: params.employerContributionAmount,
    employeeContributionAmount: params.employeeContributionAmount,
    updatedByUserId: params.updatedByUserId,
    updatedAt: new Date(),
  }
  if (params.coverageLevel !== undefined) {
    patch.coverageLevel = params.coverageLevel
  }
  if (params.effectiveFrom !== undefined) {
    patch.effectiveFrom = params.effectiveFrom
  }
  if (params.effectiveTo !== undefined) {
    patch.effectiveTo = params.effectiveTo
  }

  await db
    .update(hrmBenefitEnrollment)
    .set(patch)
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, params.organizationId),
        eq(hrmBenefitEnrollment.id, params.enrollmentId)
      )
    )
}
