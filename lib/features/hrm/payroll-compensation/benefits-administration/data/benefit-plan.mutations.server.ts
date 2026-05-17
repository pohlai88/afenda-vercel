import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefit } from "#lib/db/schema"

import { BENEFIT_KIND_DEFAULT_CATEGORY } from "./benefit-helpers.shared"
import type { BenefitKind } from "./benefit-helpers.shared"

export type CreateBenefitPlanRowParams = {
  organizationId: string
  code: string
  name: string
  description: string | null
  benefitKind: string
  benefitCategory: string
  benefitType: string | null
  planYear: number | null
  carrierName: string | null
  providerName: string | null
  policyReference: string | null
  providerId: string | null
  scopeCountryCodes: string[] | null
  scopeLegalEntityCodes: string[] | null
  eligibilityRules: Record<string, unknown> | null
  rateTableVersion: string | null
  rateTable: Record<string, unknown> | null
  employerContributionType: string
  employerContributionValue: string | null
  employeeContributionType: string
  employeeContributionValue: string | null
  coverageLevels: string[] | null
  waitingPeriodDays: number
  maxAnnualAmount: string | null
  effectiveFrom: Date | null
  createdByUserId: string
}

export async function insertBenefitPlan(
  params: CreateBenefitPlanRowParams
): Promise<{ id: string }> {
  const [row] = await db
    .insert(hrmBenefit)
    .values({
      organizationId: params.organizationId,
      code: params.code,
      name: params.name,
      description: params.description,
      benefitKind: params.benefitKind,
      benefitCategory: params.benefitCategory,
      benefitType: params.benefitType,
      planYear: params.planYear,
      carrierName: params.carrierName,
      providerName: params.providerName,
      policyReference: params.policyReference,
      providerId: params.providerId,
      scopeCountryCodes: params.scopeCountryCodes,
      scopeLegalEntityCodes: params.scopeLegalEntityCodes,
      eligibilityRules: params.eligibilityRules,
      rateTableVersion: params.rateTableVersion,
      rateTable: params.rateTable,
      employerContributionType: params.employerContributionType,
      employerContributionValue: params.employerContributionValue,
      employeeContributionType: params.employeeContributionType,
      employeeContributionValue: params.employeeContributionValue,
      coverageLevels: params.coverageLevels,
      waitingPeriodDays: params.waitingPeriodDays,
      maxAnnualAmount: params.maxAnnualAmount,
      effectiveFrom: params.effectiveFrom,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    })
    .returning({ id: hrmBenefit.id })

  return { id: row.id }
}

export type UpdateBenefitPlanRowParams = CreateBenefitPlanRowParams & {
  planId: string
}

export async function updateBenefitPlanRow(
  params: UpdateBenefitPlanRowParams
): Promise<void> {
  await db
    .update(hrmBenefit)
    .set({
      code: params.code,
      name: params.name,
      description: params.description,
      benefitKind: params.benefitKind,
      benefitCategory: params.benefitCategory,
      benefitType: params.benefitType,
      planYear: params.planYear,
      carrierName: params.carrierName,
      providerName: params.providerName,
      policyReference: params.policyReference,
      providerId: params.providerId,
      scopeCountryCodes: params.scopeCountryCodes,
      scopeLegalEntityCodes: params.scopeLegalEntityCodes,
      eligibilityRules: params.eligibilityRules,
      rateTableVersion: params.rateTableVersion,
      rateTable: params.rateTable,
      employerContributionType: params.employerContributionType,
      employerContributionValue: params.employerContributionValue,
      employeeContributionType: params.employeeContributionType,
      employeeContributionValue: params.employeeContributionValue,
      coverageLevels: params.coverageLevels,
      waitingPeriodDays: params.waitingPeriodDays,
      maxAnnualAmount: params.maxAnnualAmount,
      effectiveFrom: params.effectiveFrom,
      updatedByUserId: params.createdByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefit.organizationId, params.organizationId),
        eq(hrmBenefit.id, params.planId)
      )
    )
}

export function resolveBenefitCategoryFromKindInput(
  benefitKind: string,
  benefitCategory: string | undefined
): string {
  if (benefitCategory) return benefitCategory
  if (
    typeof benefitKind === "string" &&
    benefitKind in BENEFIT_KIND_DEFAULT_CATEGORY
  ) {
    return BENEFIT_KIND_DEFAULT_CATEGORY[benefitKind as BenefitKind]
  }
  return "welfare"
}

export async function archiveBenefitPlanRow(params: {
  organizationId: string
  planId: string
  updatedByUserId: string
}): Promise<void> {
  await db
    .update(hrmBenefit)
    .set({
      isActive: false,
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefit.organizationId, params.organizationId),
        eq(hrmBenefit.id, params.planId)
      )
    )
}
