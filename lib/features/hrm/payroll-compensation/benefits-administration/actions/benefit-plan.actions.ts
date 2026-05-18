"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, count, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmBenefitEnrollment } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BENEFIT_AUDIT } from "../benefit.contract"
import {
  buildBenefitPlanAuditMetadata,
  toBenefitPlanAuditSnapshot,
} from "../data/benefit-audit-metadata.shared"
import {
  buildPlanEligibilityRulesPayload,
  parseBenefitScopeCodesInput,
} from "../data/benefit-plan-input.shared"
import {
  archiveBenefitPlanRow,
  insertBenefitPlan,
  resolveBenefitCategoryFromKindInput,
  updateBenefitPlanRow,
} from "../data/benefit-plan.mutations.server"
import { getBenefitProviderForOrganization } from "../data/benefit-provider.queries.server"
import { getBenefitPlanForOrganization } from "../data/benefit.queries.server"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  archiveBenefitPlanFormSchema,
  createBenefitPlanFormSchema,
  updateBenefitPlanFormSchema,
} from "../schema/benefit.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  BenefitArchiveFormState,
  BenefitPlanMutationFormState,
} from "../../../types"

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function revalidateBenefits() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/benefits"),
    "layout"
  )
}

function parseIsoDate(iso: string | undefined): Date | null {
  if (!iso) {
    return null
  }
  return new Date(`${iso}T12:00:00.000Z`)
}

function toDecimalOrNull(
  value: number | undefined,
  fractionDigits: number
): string | null {
  if (value === undefined) {
    return null
  }
  return value.toFixed(fractionDigits)
}

function trimOrNull(value: string | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function hasCheckedValue(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => String(value) === "true")
}

async function resolveBenefitPlanProviderId(
  organizationId: string,
  providerId: string | undefined
): Promise<
  | { ok: true; providerId: string | null }
  | { ok: false; field: "providerId"; message: string }
> {
  if (!providerId) {
    return { ok: true, providerId: null }
  }

  const provider = await getBenefitProviderForOrganization(
    organizationId,
    providerId
  )
  if (!provider) {
    return {
      ok: false,
      field: "providerId",
      message: "Benefit provider not found.",
    }
  }
  if (!provider.isActive) {
    return {
      ok: false,
      field: "providerId",
      message: "Cannot link an inactive benefit provider.",
    }
  }

  return { ok: true, providerId }
}

function parsePlanCatalogFields(data: {
  providerId?: string
  scopeCountryCodes?: string
  scopeLegalEntityCodes?: string
  eligibilityRules?: Record<string, unknown>
  requiresEnrollmentApproval?: boolean
  newHireAutoEnroll?: boolean
}) {
  return {
    providerId: data.providerId,
    scopeCountryCodes: parseBenefitScopeCodesInput(data.scopeCountryCodes),
    scopeLegalEntityCodes: parseBenefitScopeCodesInput(
      data.scopeLegalEntityCodes
    ),
    eligibilityRules: buildPlanEligibilityRulesPayload({
      existingJson: data.eligibilityRules,
      requiresEnrollmentApproval: data.requiresEnrollmentApproval,
      newHireAutoEnroll: data.newHireAutoEnroll,
    }),
  }
}

// ---------------------------------------------------------------------------
// Tier B — benefit plan catalog (admin-gated)
// ---------------------------------------------------------------------------

export async function createBenefitPlanAction(
  _prev: BenefitPlanMutationFormState | undefined,
  formData: FormData
): Promise<BenefitPlanMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const coverageLevels = formData
    .getAll("coverageLevels")
    .map((v) => String(v))
    .filter(Boolean)

  const parsed = createBenefitPlanFormSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    benefitKind: formData.get("benefitKind"),
    benefitCategory: formData.get("benefitCategory"),
    benefitType: formData.get("benefitType"),
    planYear: formData.get("planYear"),
    carrierName: formData.get("carrierName"),
    providerName: formData.get("providerName"),
    policyReference: formData.get("policyReference"),
    providerId: formData.get("providerId"),
    scopeCountryCodes: formData.get("scopeCountryCodes"),
    scopeLegalEntityCodes: formData.get("scopeLegalEntityCodes"),
    requiresEnrollmentApproval: hasCheckedValue(
      formData,
      "requiresEnrollmentApproval"
    ),
    newHireAutoEnroll: hasCheckedValue(formData, "newHireAutoEnroll"),
    eligibilityRules: formData.get("eligibilityRules"),
    rateTableVersion: formData.get("rateTableVersion"),
    rateTable: formData.get("rateTable"),
    employerContributionType: formData.get("employerContributionType"),
    employerContributionValue: formData.get("employerContributionValue"),
    employeeContributionType: formData.get("employeeContributionType"),
    employeeContributionValue: formData.get("employeeContributionValue"),
    coverageLevels: coverageLevels.length > 0 ? coverageLevels : undefined,
    waitingPeriodDays: formData.get("waitingPeriodDays"),
    maxAnnualAmount: formData.get("maxAnnualAmount"),
    effectiveFrom: formData.get("effectiveFrom"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      benefitKind: fe.benefitKind?.[0],
      benefitType: fe.benefitType?.[0],
      planYear: fe.planYear?.[0],
      carrierName: fe.carrierName?.[0],
      providerName: fe.providerName?.[0],
      policyReference: fe.policyReference?.[0],
      rateTableVersion: fe.rateTableVersion?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      waitingPeriodDays: fe.waitingPeriodDays?.[0],
      employerContributionType: fe.employerContributionType?.[0],
      employeeContributionType: fe.employeeContributionType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data
  const effectiveFrom = parseIsoDate(data.effectiveFrom ?? undefined)
  const benefitCategory = resolveBenefitCategoryFromKindInput(
    data.benefitKind,
    data.benefitCategory
  )

  const providerResolution = await resolveBenefitPlanProviderId(
    organizationId,
    data.providerId
  )
  if (!providerResolution.ok) {
    return hrmActionFailure({
      form: providerResolution.message,
    })
  }

  const catalogFields = parsePlanCatalogFields(data)

  let row: { id: string }
  try {
    row = await insertBenefitPlan({
      organizationId,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      benefitKind: data.benefitKind,
      benefitCategory,
      benefitType: trimOrNull(data.benefitType),
      planYear: data.planYear ?? null,
      carrierName: trimOrNull(data.carrierName),
      providerName: trimOrNull(data.providerName),
      policyReference: trimOrNull(data.policyReference),
      providerId: providerResolution.providerId,
      scopeCountryCodes: catalogFields.scopeCountryCodes,
      scopeLegalEntityCodes: catalogFields.scopeLegalEntityCodes,
      eligibilityRules: catalogFields.eligibilityRules,
      rateTableVersion: trimOrNull(data.rateTableVersion),
      rateTable: data.rateTable ?? null,
      employerContributionType: data.employerContributionType,
      employerContributionValue: toDecimalOrNull(
        data.employerContributionValue,
        4
      ),
      employeeContributionType: data.employeeContributionType,
      employeeContributionValue: toDecimalOrNull(
        data.employeeContributionValue,
        4
      ),
      coverageLevels:
        data.coverageLevels && data.coverageLevels.length > 0
          ? [...data.coverageLevels]
          : null,
      waitingPeriodDays: data.waitingPeriodDays,
      maxAnnualAmount: toDecimalOrNull(data.maxAnnualAmount, 2),
      effectiveFrom,
      createdByUserId: userId,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "A benefit with this code already exists for the organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create benefit plan." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.plan.create,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: row.id,
      metadata: buildBenefitPlanAuditMetadata({
        after: toBenefitPlanAuditSnapshot({
          code: data.code.trim(),
          benefitKind: data.benefitKind,
          benefitCategory,
          rateTableVersion: trimOrNull(data.rateTableVersion),
          employerContributionType: data.employerContributionType,
          employeeContributionType: data.employeeContributionType,
          isActive: true,
        }),
      }),
    })
  )

  revalidateBenefits()
  return { ok: true, planId: row.id }
}

export async function updateBenefitPlanAction(
  _prev: BenefitPlanMutationFormState | undefined,
  formData: FormData
): Promise<BenefitPlanMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const coverageLevels = formData
    .getAll("coverageLevels")
    .map((v) => String(v))
    .filter(Boolean)

  const parsed = updateBenefitPlanFormSchema.safeParse({
    planId: formData.get("planId"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    benefitKind: formData.get("benefitKind"),
    benefitCategory: formData.get("benefitCategory"),
    benefitType: formData.get("benefitType"),
    planYear: formData.get("planYear"),
    carrierName: formData.get("carrierName"),
    providerName: formData.get("providerName"),
    policyReference: formData.get("policyReference"),
    providerId: formData.get("providerId"),
    scopeCountryCodes: formData.get("scopeCountryCodes"),
    scopeLegalEntityCodes: formData.get("scopeLegalEntityCodes"),
    requiresEnrollmentApproval: hasCheckedValue(
      formData,
      "requiresEnrollmentApproval"
    ),
    newHireAutoEnroll: hasCheckedValue(formData, "newHireAutoEnroll"),
    eligibilityRules: formData.get("eligibilityRules"),
    rateTableVersion: formData.get("rateTableVersion"),
    rateTable: formData.get("rateTable"),
    employerContributionType: formData.get("employerContributionType"),
    employerContributionValue: formData.get("employerContributionValue"),
    employeeContributionType: formData.get("employeeContributionType"),
    employeeContributionValue: formData.get("employeeContributionValue"),
    coverageLevels: coverageLevels.length > 0 ? coverageLevels : undefined,
    waitingPeriodDays: formData.get("waitingPeriodDays"),
    maxAnnualAmount: formData.get("maxAnnualAmount"),
    effectiveFrom: formData.get("effectiveFrom"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      planId: fe.planId?.[0],
      code: fe.code?.[0],
      name: fe.name?.[0],
      benefitKind: fe.benefitKind?.[0],
      benefitType: fe.benefitType?.[0],
      planYear: fe.planYear?.[0],
      carrierName: fe.carrierName?.[0],
      providerName: fe.providerName?.[0],
      policyReference: fe.policyReference?.[0],
      rateTableVersion: fe.rateTableVersion?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      waitingPeriodDays: fe.waitingPeriodDays?.[0],
      employerContributionType: fe.employerContributionType?.[0],
      employeeContributionType: fe.employeeContributionType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data
  const beforePlan = await getBenefitPlanForOrganization(
    organizationId,
    data.planId
  )
  if (!beforePlan) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }

  const effectiveFrom = parseIsoDate(data.effectiveFrom ?? undefined)
  const benefitCategory = resolveBenefitCategoryFromKindInput(
    data.benefitKind,
    data.benefitCategory
  )

  const providerResolution = await resolveBenefitPlanProviderId(
    organizationId,
    data.providerId
  )
  if (!providerResolution.ok) {
    return hrmActionFailure({
      form: providerResolution.message,
    })
  }

  const catalogFields = parsePlanCatalogFields({
    providerId: data.providerId,
    scopeCountryCodes: data.scopeCountryCodes,
    scopeLegalEntityCodes: data.scopeLegalEntityCodes,
    requiresEnrollmentApproval: data.requiresEnrollmentApproval,
    newHireAutoEnroll: data.newHireAutoEnroll,
    eligibilityRules:
      data.eligibilityRules ??
      (beforePlan.eligibilityRules as Record<string, unknown> | undefined) ??
      undefined,
  })

  try {
    await updateBenefitPlanRow({
      organizationId,
      planId: data.planId,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      benefitKind: data.benefitKind,
      benefitCategory,
      benefitType: trimOrNull(data.benefitType),
      planYear: data.planYear ?? null,
      carrierName: trimOrNull(data.carrierName),
      providerName: trimOrNull(data.providerName),
      policyReference: trimOrNull(data.policyReference),
      providerId: providerResolution.providerId,
      scopeCountryCodes: catalogFields.scopeCountryCodes,
      scopeLegalEntityCodes: catalogFields.scopeLegalEntityCodes,
      eligibilityRules: catalogFields.eligibilityRules,
      rateTableVersion: trimOrNull(data.rateTableVersion),
      rateTable: data.rateTable ?? null,
      employerContributionType: data.employerContributionType,
      employerContributionValue: toDecimalOrNull(
        data.employerContributionValue,
        4
      ),
      employeeContributionType: data.employeeContributionType,
      employeeContributionValue: toDecimalOrNull(
        data.employeeContributionValue,
        4
      ),
      coverageLevels:
        data.coverageLevels && data.coverageLevels.length > 0
          ? [...data.coverageLevels]
          : null,
      waitingPeriodDays: data.waitingPeriodDays,
      maxAnnualAmount: toDecimalOrNull(data.maxAnnualAmount, 2),
      effectiveFrom,
      createdByUserId: userId,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "A benefit with this code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not update benefit plan." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.plan.update,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: data.planId,
      metadata: buildBenefitPlanAuditMetadata({
        before: toBenefitPlanAuditSnapshot({
          code: beforePlan.code,
          benefitKind: beforePlan.benefitKind,
          benefitCategory: beforePlan.benefitCategory,
          rateTableVersion: beforePlan.rateTableVersion,
          employerContributionType: beforePlan.employerContributionType,
          employeeContributionType: beforePlan.employeeContributionType,
          isActive: beforePlan.isActive,
        }),
        after: toBenefitPlanAuditSnapshot({
          code: data.code.trim(),
          benefitKind: data.benefitKind,
          benefitCategory,
          rateTableVersion: trimOrNull(data.rateTableVersion),
          employerContributionType: data.employerContributionType,
          employeeContributionType: data.employeeContributionType,
          isActive: beforePlan.isActive,
        }),
      }),
    })
  )

  revalidateBenefits()
  return { ok: true, planId: data.planId }
}

export async function archiveBenefitPlanAction(
  _prev: BenefitArchiveFormState | undefined,
  formData: FormData
): Promise<BenefitArchiveFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = archiveBenefitPlanFormSchema.safeParse({
    planId: formData.get("planId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      planId: parsed.error.flatten().fieldErrors.planId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { planId } = parsed.data

  const [blocker] = await db
    .select({ n: count(hrmBenefitEnrollment.id) })
    .from(hrmBenefitEnrollment)
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.benefitId, planId),
        inArray(hrmBenefitEnrollment.state, ["pending", "active"])
      )
    )

  if (Number(blocker?.n ?? 0) > 0) {
    return hrmActionFailure({
      form: "Cannot archive a plan with pending or active enrollments. Terminate or waive enrollments first.",
    })
  }

  const beforePlan = await getBenefitPlanForOrganization(organizationId, planId)
  if (!beforePlan) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }

  await archiveBenefitPlanRow({
    organizationId,
    planId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.plan.archive,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: planId,
      metadata: buildBenefitPlanAuditMetadata({
        before: toBenefitPlanAuditSnapshot({
          code: beforePlan.code,
          benefitKind: beforePlan.benefitKind,
          benefitCategory: beforePlan.benefitCategory,
          rateTableVersion: beforePlan.rateTableVersion,
          employerContributionType: beforePlan.employerContributionType,
          employeeContributionType: beforePlan.employeeContributionType,
          isActive: true,
        }),
        after: toBenefitPlanAuditSnapshot({
          ...beforePlan,
          isActive: false,
        }),
      }),
    })
  )

  revalidateBenefits()
  return { ok: true }
}
