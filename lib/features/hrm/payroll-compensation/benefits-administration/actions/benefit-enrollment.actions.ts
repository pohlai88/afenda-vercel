"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmBenefitEnrollment } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BENEFIT_AUDIT } from "../benefit.contract"
import { evaluateBenefitEligibilityForEmployee } from "../data/benefit-enterprise.queries.server"
import {
  describeBenefitEnrollmentCoverageConflict,
  detectBenefitEnrollmentCoverageConflict,
} from "../data/benefit-enrollment-guard.shared"
import { summarizeBenefitEligibilityFailure } from "../data/benefit-eligibility.shared"
import {
  getBenefitEnrollmentForOrganization,
  getBenefitPlanForOrganization,
  listBenefitEnrollmentCoverageRowsForEmployeePlan,
} from "../data/benefit.queries.server"
import {
  insertBenefitEnrollment,
  updateBenefitEnrollmentChange,
} from "../data/benefit-enrollment.mutations.server"
import {
  buildBenefitEnrollmentChangeAuditMetadata,
  toBenefitEnrollmentAuditSnapshot,
} from "../data/benefit-audit-metadata.shared"
import { resolveBenefitEnrollmentContributions } from "../data/benefit-contribution.shared"
import {
  planRequiresEnrollmentApproval,
  resolveInitialBenefitEnrollmentState,
} from "../data/benefit-enrollment-state.shared"
import { isBenefitCoverageLevel } from "../data/benefit-helpers.shared"
import { getEmployeeForOrganization } from "../../../employee-management/employee-records-management/data/employee.queries.server"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  listClosedPayrollPeriodsOverlappingRange,
  type ClosedPayrollPeriodRow,
} from "../../payroll-processing/data/payroll.queries.server"
import {
  countBenefitEnrollmentDependents,
  replaceBenefitEnrollmentDependents,
  validateEnrollmentDependents,
} from "../data/benefit-enrollment-dependent.server"
import {
  activateBenefitEnrollmentFormSchema,
  changeBenefitEnrollmentFormSchema,
  enrollBenefitFormSchema,
  expireBenefitEnrollmentFormSchema,
  suspendBenefitEnrollmentFormSchema,
  terminateBenefitEnrollmentFormSchema,
  waiveBenefitEnrollmentFormSchema,
} from "../schema/benefit.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  BenefitEnrollFormState,
  BenefitEnrollmentTransitionFormState,
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

function parseIsoDateStart(iso: string | undefined): Date {
  const d = iso ?? new Date().toISOString().slice(0, 10)
  return new Date(`${d}T12:00:00.000Z`)
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function describeClosedPayrollPeriodConflict(
  action: "activate" | "terminate",
  period: ClosedPayrollPeriodRow
): string {
  return `Cannot ${action} this enrollment because payroll period ${period.periodStart} to ${period.periodEnd} is ${period.state}.`
}

// ---------------------------------------------------------------------------
// Tier B — enrollments (admin-gated)
// ---------------------------------------------------------------------------

export async function enrollBenefitAction(
  _prev: BenefitEnrollFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const dependentIds = formData
    .getAll("dependentIds")
    .map((value) => String(value))
    .filter(Boolean)

  const parsed = enrollBenefitFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    planId: formData.get("planId"),
    coverageLevel: formData.get("coverageLevel"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo"),
    dependentIds,
    eligibilityOverrideReason: formData.get("eligibilityOverrideReason"),
    employerContributionAmount: formData.get("employerContributionAmount"),
    employeeContributionAmount: formData.get("employeeContributionAmount"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      planId: fe.planId?.[0],
      coverageLevel: fe.coverageLevel?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data

  const [plan, employee] = await Promise.all([
    getBenefitPlanForOrganization(organizationId, data.planId),
    getEmployeeForOrganization(organizationId, data.employeeId),
  ])

  if (!plan) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }
  if (!plan.isActive) {
    return hrmActionFailure({
      planId: "Cannot enroll into an inactive benefit plan.",
    })
  }
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot enroll an archived employee.",
    })
  }

  const effectiveFrom = parseIsoDateStart(data.effectiveFrom)
  const effectiveTo = data.effectiveTo
    ? parseIsoDateStart(data.effectiveTo)
    : null
  if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
    return hrmActionFailure({
      effectiveTo: "Effective end must be on or after effective start.",
      form: "Effective end must be on or after effective start.",
    })
  }

  const dependentError = await validateEnrollmentDependents({
    organizationId,
    employeeId: data.employeeId,
    coverageLevel: data.coverageLevel,
    dependentIds: data.dependentIds ?? [],
  })
  if (dependentError) {
    return hrmActionFailure({ form: dependentError })
  }

  const existingCoverage =
    await listBenefitEnrollmentCoverageRowsForEmployeePlan(
      organizationId,
      data.employeeId,
      data.planId
    )
  const coverageConflict = detectBenefitEnrollmentCoverageConflict({
    candidateStart: effectiveFrom,
    candidateEffectiveTo: effectiveTo,
    existing: existingCoverage,
  })
  if (coverageConflict) {
    const message = describeBenefitEnrollmentCoverageConflict(coverageConflict)
    return hrmActionFailure({
      effectiveFrom: message,
      form: message,
    })
  }

  const eligibility = await evaluateBenefitEligibilityForEmployee({
    organizationId,
    employeeId: data.employeeId,
    planId: data.planId,
    asOf: effectiveFrom,
    requestedCoverageLevel: data.coverageLevel,
  })
  if (!eligibility) {
    return hrmActionFailure({
      form: "Could not resolve benefit eligibility for this employee.",
    })
  }
  const overrideReason = data.eligibilityOverrideReason?.trim() ?? ""
  if (!eligibility.result.eligible && !overrideReason) {
    const reasonCodes = new Set(
      eligibility.result.reasons.map((reason) => reason.code)
    )
    const failure = summarizeBenefitEligibilityFailure(eligibility.result)
    return hrmActionFailure({
      coverageLevel:
        reasonCodes.has("coverage_not_offered") ||
        reasonCodes.has("dependent_required")
          ? (failure ?? undefined)
          : undefined,
      form: failure ?? undefined,
    })
  }

  const initialState = resolveInitialBenefitEnrollmentState(
    plan.eligibilityRules
  )

  let row: { id: string; contributionSource: string }
  try {
    row = await insertBenefitEnrollment({
      organizationId,
      planId: data.planId,
      employeeId: data.employeeId,
      coverageLevel: data.coverageLevel,
      effectiveFrom,
      effectiveTo,
      plan,
      dependentCount: eligibility.dependentCount,
      employerContributionAmountOverride: data.employerContributionAmount,
      employeeContributionAmountOverride: data.employeeContributionAmount,
      eligibilityOverrideApprovedByUserId: overrideReason ? userId : null,
      eligibilityOverrideReason: overrideReason || null,
      createdByUserId: userId,
      initialState,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        form: "This employee already has a pending or active enrollment for this benefit plan.",
      })
    }
    return hrmActionFailure({ form: "Could not create enrollment." })
  }

  await replaceBenefitEnrollmentDependents({
    organizationId,
    enrollmentId: row.id,
    employeeId: data.employeeId,
    dependentIds: data.dependentIds ?? [],
    effectiveFrom,
    effectiveTo,
    createdByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.enroll,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: row.id,
      metadata: {
        benefitId: data.planId,
        employeeId: data.employeeId,
        coverageLevel: data.coverageLevel,
        effectiveFrom: toIsoDate(effectiveFrom),
        employerContributionAmountProvided:
          data.employerContributionAmount !== undefined,
        employeeContributionAmountProvided:
          data.employeeContributionAmount !== undefined,
        eligibilityOverrideApplied: Boolean(overrideReason),
        contributionSource: row.contributionSource,
        initialState,
      },
    })
  )

  if (initialState === "active") {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: HRM_BENEFIT_AUDIT.enrollment.activate,
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "hrm_benefit_enrollment",
        resourceId: row.id,
        metadata: {
          benefitId: data.planId,
          employeeId: data.employeeId,
          effectiveFrom: toIsoDate(effectiveFrom),
          autoActivated: true,
        },
      })
    )
  }

  if (overrideReason) {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: HRM_BENEFIT_AUDIT.eligibility.override,
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "hrm_benefit_enrollment",
        resourceId: row.id,
        metadata: {
          benefitId: data.planId,
          employeeId: data.employeeId,
          overrideReasonProvided: true,
        },
      })
    )
  }

  revalidateBenefits()
  return { ok: true, enrollmentId: row.id }
}

export async function activateBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = activateBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      enrollmentId: parsed.error.flatten().fieldErrors.enrollmentId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "pending") {
    return hrmActionFailure({
      form: "Only pending enrollments can be activated.",
    })
  }

  const plan = await getBenefitPlanForOrganization(
    organizationId,
    enrollment.benefitId
  )
  if (!plan) {
    return hrmActionFailure({ form: "Benefit plan not found." })
  }
  if (!planRequiresEnrollmentApproval(plan.eligibilityRules)) {
    return hrmActionFailure({
      form: "This plan does not require enrollment approval.",
    })
  }

  const coverageConflict = detectBenefitEnrollmentCoverageConflict({
    candidateStart: enrollment.effectiveFrom ?? enrollment.enrolledAt,
    existing: await listBenefitEnrollmentCoverageRowsForEmployeePlan(
      organizationId,
      enrollment.employeeId,
      enrollment.benefitId
    ),
    excludeEnrollmentId: enrollment.id,
  })
  if (coverageConflict) {
    return hrmActionFailure({
      form: describeBenefitEnrollmentCoverageConflict(coverageConflict),
    })
  }

  const closedPeriods = await listClosedPayrollPeriodsOverlappingRange({
    organizationId,
    rangeStart: enrollment.effectiveFrom ?? enrollment.enrolledAt,
  })
  if (closedPeriods[0]) {
    return hrmActionFailure({
      form: describeClosedPayrollPeriodConflict("activate", closedPeriods[0]),
    })
  }

  await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "active",
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.activate,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: parsed.data.enrollmentId,
      metadata: {
        benefitId: enrollment.benefitId,
        employeeId: enrollment.employeeId,
        effectiveFrom: toIsoDate(
          enrollment.effectiveFrom ?? enrollment.enrolledAt
        ),
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function waiveBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = waiveBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    waivedReason: formData.get("waivedReason"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      enrollmentId: fe.enrollmentId?.[0],
      waivedReason: fe.waivedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "pending") {
    return hrmActionFailure({
      form: "Only pending enrollments can be waived.",
    })
  }

  await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "waived",
      waivedReason: parsed.data.waivedReason?.trim() ?? null,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.waive,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: parsed.data.enrollmentId,
      metadata: {
        benefitId: enrollment.benefitId,
        employeeId: enrollment.employeeId,
        effectiveFrom: toIsoDate(
          enrollment.effectiveFrom ?? enrollment.enrolledAt
        ),
        waivedReasonProvided: Boolean(parsed.data.waivedReason?.trim()),
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function terminateBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = terminateBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    terminationReason: formData.get("terminationReason"),
    terminatedAt: formData.get("terminatedAt"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      enrollmentId: fe.enrollmentId?.[0],
      terminationReason: fe.terminationReason?.[0],
      terminatedAt: fe.terminatedAt?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "pending" && enrollment.state !== "active") {
    return hrmActionFailure({
      form: "Only pending or active enrollments can be terminated.",
    })
  }

  const terminatedAt = parseIsoDateStart(parsed.data.terminatedAt)
  const coverageStart = enrollment.effectiveFrom ?? enrollment.enrolledAt
  if (terminatedAt.getTime() < coverageStart.getTime()) {
    return hrmActionFailure({
      terminatedAt:
        "Termination date cannot be before enrollment coverage starts.",
      form: "Termination date cannot be before enrollment coverage starts.",
    })
  }

  const closedPeriods = await listClosedPayrollPeriodsOverlappingRange({
    organizationId,
    rangeStart: terminatedAt,
  })
  if (closedPeriods[0]) {
    return hrmActionFailure({
      form: describeClosedPayrollPeriodConflict("terminate", closedPeriods[0]),
    })
  }

  await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "terminated",
      terminatedAt,
      terminationReason: parsed.data.terminationReason?.trim() ?? null,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.terminate,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: parsed.data.enrollmentId,
      metadata: {
        benefitId: enrollment.benefitId,
        employeeId: enrollment.employeeId,
        effectiveFrom: toIsoDate(coverageStart),
        terminatedAt: toIsoDate(terminatedAt),
        terminationReasonProvided: Boolean(
          parsed.data.terminationReason?.trim()
        ),
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function suspendBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = suspendBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    suspensionReason: formData.get("suspensionReason"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      enrollmentId: parsed.error.flatten().fieldErrors.enrollmentId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "active") {
    return hrmActionFailure({
      form: "Only active enrollments can be suspended.",
    })
  }

  await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "suspended",
      terminationReason: parsed.data.suspensionReason?.trim() ?? null,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.suspend,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: parsed.data.enrollmentId,
      metadata: {
        benefitId: enrollment.benefitId,
        employeeId: enrollment.employeeId,
        suspensionReasonProvided: Boolean(parsed.data.suspensionReason?.trim()),
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function expireBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = expireBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    effectiveTo: formData.get("effectiveTo"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      enrollmentId: parsed.error.flatten().fieldErrors.enrollmentId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "active" && enrollment.state !== "suspended") {
    return hrmActionFailure({
      form: "Only active or suspended enrollments can be expired.",
    })
  }

  const effectiveTo = parseIsoDateStart(
    parsed.data.effectiveTo ??
      enrollment.effectiveTo?.toISOString().slice(0, 10) ??
      new Date().toISOString().slice(0, 10)
  )
  const coverageStart = enrollment.effectiveFrom ?? enrollment.enrolledAt
  if (effectiveTo.getTime() < coverageStart.getTime()) {
    return hrmActionFailure({
      form: "Coverage end cannot be before coverage starts.",
    })
  }

  await db
    .update(hrmBenefitEnrollment)
    .set({
      state: "expired",
      effectiveTo,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitEnrollment.organizationId, organizationId),
        eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment.expire,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: parsed.data.enrollmentId,
      metadata: {
        benefitId: enrollment.benefitId,
        employeeId: enrollment.employeeId,
        effectiveTo: toIsoDate(effectiveTo),
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function changeBenefitEnrollmentAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const dependentIds = formData
    .getAll("dependentIds")
    .map((value) => String(value))
    .filter(Boolean)

  const parsed = changeBenefitEnrollmentFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    coverageLevel: formData.get("coverageLevel") || undefined,
    effectiveFrom: formData.get("effectiveFrom") || undefined,
    effectiveTo: formData.get("effectiveTo") || undefined,
    dependentIds: dependentIds.length > 0 ? dependentIds : undefined,
    employerContributionAmount: formData.get("employerContributionAmount"),
    employeeContributionAmount: formData.get("employeeContributionAmount"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      enrollmentId: fe.enrollmentId?.[0],
      coverageLevel: fe.coverageLevel?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (!["pending", "active"].includes(enrollment.state)) {
    return hrmActionFailure({
      form: "Only pending or active enrollments can be changed.",
    })
  }

  const plan = await getBenefitPlanForOrganization(
    organizationId,
    enrollment.benefitId
  )
  if (!plan) {
    return hrmActionFailure({ form: "Benefit plan not found." })
  }

  const coverageLevel =
    parsed.data.coverageLevel ??
    (enrollment.coverageLevel &&
    isBenefitCoverageLevel(enrollment.coverageLevel)
      ? enrollment.coverageLevel
      : "employee_only")

  const effectiveFrom = parsed.data.effectiveFrom
    ? parseIsoDateStart(parsed.data.effectiveFrom)
    : (enrollment.effectiveFrom ?? enrollment.enrolledAt)
  const effectiveTo = parsed.data.effectiveTo
    ? parseIsoDateStart(parsed.data.effectiveTo)
    : enrollment.effectiveTo

  const currentDependentCount = await countBenefitEnrollmentDependents({
    organizationId,
    enrollmentId: enrollment.id,
  })
  const dependentCount =
    parsed.data.dependentIds !== undefined
      ? parsed.data.dependentIds.length
      : currentDependentCount

  if (parsed.data.dependentIds !== undefined) {
    const dependentError = await validateEnrollmentDependents({
      organizationId,
      employeeId: enrollment.employeeId,
      coverageLevel,
      dependentIds: parsed.data.dependentIds,
    })
    if (dependentError) {
      return hrmActionFailure({ form: dependentError })
    }
    await replaceBenefitEnrollmentDependents({
      organizationId,
      enrollmentId: enrollment.id,
      employeeId: enrollment.employeeId,
      dependentIds: parsed.data.dependentIds,
      effectiveFrom,
      effectiveTo,
      createdByUserId: userId,
    })
  }

  const resolved = resolveBenefitEnrollmentContributions({
    plan,
    coverageLevel,
    dependentCount,
    overrides:
      parsed.data.employerContributionAmount !== undefined ||
      parsed.data.employeeContributionAmount !== undefined
        ? {
            employerContributionAmount: parsed.data.employerContributionAmount,
            employeeContributionAmount: parsed.data.employeeContributionAmount,
          }
        : undefined,
  })

  const beforeSnapshot = toBenefitEnrollmentAuditSnapshot({
    state: enrollment.state,
    coverageLevel: enrollment.coverageLevel,
    effectiveFrom: enrollment.effectiveFrom ?? enrollment.enrolledAt,
    effectiveTo: enrollment.effectiveTo,
    employerContributionAmount: enrollment.employerContributionAmount,
    employeeContributionAmount: enrollment.employeeContributionAmount,
    dependentCount: currentDependentCount,
  })

  await updateBenefitEnrollmentChange({
    organizationId,
    enrollmentId: enrollment.id,
    coverageLevel,
    effectiveFrom: parsed.data.effectiveFrom ? effectiveFrom : undefined,
    effectiveTo:
      parsed.data.effectiveTo !== undefined ? effectiveTo : undefined,
    employerContributionAmount: resolved.employerContributionAmount,
    employeeContributionAmount: resolved.employeeContributionAmount,
    updatedByUserId: userId,
  })

  const afterSnapshot = toBenefitEnrollmentAuditSnapshot({
    state: enrollment.state,
    coverageLevel,
    effectiveFrom,
    effectiveTo,
    employerContributionAmount: resolved.employerContributionAmount,
    employeeContributionAmount: resolved.employeeContributionAmount,
    dependentCount,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.enrollment_change,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_enrollment",
      resourceId: enrollment.id,
      metadata: buildBenefitEnrollmentChangeAuditMetadata({
        changeKind: "enrollment_change",
        before: beforeSnapshot,
        after: afterSnapshot,
        contributionSource: resolved.source,
      }),
    })
  )

  revalidateBenefits()
  return { ok: true }
}
