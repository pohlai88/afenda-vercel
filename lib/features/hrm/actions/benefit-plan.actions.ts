"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, count, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmBenefit, hrmBenefitEnrollment } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  archiveBenefitPlanFormSchema,
  createBenefitPlanFormSchema,
  updateBenefitPlanFormSchema,
} from "../schemas/benefit.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  BenefitArchiveFormState,
  BenefitPlanMutationFormState,
} from "../types"

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
    toLocaleOrgDashboardRevalidatePattern("/hrm/benefits"),
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
    benefitType: formData.get("benefitType"),
    planYear: formData.get("planYear"),
    carrierName: formData.get("carrierName"),
    providerName: formData.get("providerName"),
    policyReference: formData.get("policyReference"),
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

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmBenefit)
      .values({
        organizationId,
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        benefitKind: data.benefitKind,
        benefitType: trimOrNull(data.benefitType),
        planYear: data.planYear ?? null,
        carrierName: trimOrNull(data.carrierName),
        providerName: trimOrNull(data.providerName),
        policyReference: trimOrNull(data.policyReference),
        eligibilityRules: data.eligibilityRules ?? null,
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
        isActive: true,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmBenefit.id })
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
      action: "erp.hrm.benefit.create",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: row.id,
      metadata: {
        code: data.code.trim(),
        benefitKind: data.benefitKind,
      },
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
    benefitType: formData.get("benefitType"),
    planYear: formData.get("planYear"),
    carrierName: formData.get("carrierName"),
    providerName: formData.get("providerName"),
    policyReference: formData.get("policyReference"),
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
  const [existing] = await db
    .select({ id: hrmBenefit.id })
    .from(hrmBenefit)
    .where(
      and(
        eq(hrmBenefit.organizationId, organizationId),
        eq(hrmBenefit.id, data.planId)
      )
    )
    .limit(1)
  if (!existing) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }

  const effectiveFrom = parseIsoDate(data.effectiveFrom ?? undefined)

  try {
    await db
      .update(hrmBenefit)
      .set({
        code: data.code.trim(),
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        benefitKind: data.benefitKind,
        benefitType: trimOrNull(data.benefitType),
        planYear: data.planYear ?? null,
        carrierName: trimOrNull(data.carrierName),
        providerName: trimOrNull(data.providerName),
        policyReference: trimOrNull(data.policyReference),
        eligibilityRules: data.eligibilityRules ?? null,
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
        updatedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrmBenefit.organizationId, organizationId),
          eq(hrmBenefit.id, data.planId)
        )
      )
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
      action: "erp.hrm.benefit.update",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: data.planId,
      metadata: { code: data.code.trim() },
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

  const result = await db
    .update(hrmBenefit)
    .set({
      isActive: false,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefit.organizationId, organizationId),
        eq(hrmBenefit.id, planId)
      )
    )
    .returning({ id: hrmBenefit.id })

  if (result.length === 0) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.benefit.archive",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit",
      resourceId: planId,
      metadata: {},
    })
  )

  revalidateBenefits()
  return { ok: true }
}
