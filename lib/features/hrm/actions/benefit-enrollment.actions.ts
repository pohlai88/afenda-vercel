"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmBenefit, hrmBenefitEnrollment } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { evaluateBenefitEligibilityForEmployee } from "../data/benefit-enterprise.queries.server"
import {
  describeBenefitEnrollmentCoverageConflict,
  detectBenefitEnrollmentCoverageConflict,
} from "../data/benefit-enrollment-guard.shared"
import { summarizeBenefitEligibilityFailure } from "../data/benefit-eligibility.shared"
import {
  getBenefitEnrollmentForOrganization,
  listBenefitEnrollmentCoverageRowsForEmployeePlan,
} from "../data/benefit.queries.server"
import { getEmployeeForOrganization } from "../data/employee.queries.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  listClosedPayrollPeriodsOverlappingRange,
  type ClosedPayrollPeriodRow,
} from "../data/payroll.queries.server"
import {
  activateBenefitEnrollmentFormSchema,
  enrollBenefitFormSchema,
  terminateBenefitEnrollmentFormSchema,
  waiveBenefitEnrollmentFormSchema,
} from "../schemas/benefit.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  BenefitEnrollFormState,
  BenefitEnrollmentTransitionFormState,
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

function parseIsoDateStart(iso: string | undefined): Date {
  const d = iso ?? new Date().toISOString().slice(0, 10)
  return new Date(`${d}T12:00:00.000Z`)
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function toMoneyString(value: number | undefined): string | null {
  if (value === undefined) {
    return null
  }
  return value.toFixed(2)
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

  const parsed = enrollBenefitFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    planId: formData.get("planId"),
    coverageLevel: formData.get("coverageLevel"),
    effectiveFrom: formData.get("effectiveFrom"),
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
    db
      .select({
        id: hrmBenefit.id,
        isActive: hrmBenefit.isActive,
      })
      .from(hrmBenefit)
      .where(
        and(
          eq(hrmBenefit.organizationId, organizationId),
          eq(hrmBenefit.id, data.planId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
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
  const existingCoverage = await listBenefitEnrollmentCoverageRowsForEmployeePlan(
    organizationId,
    data.employeeId,
    data.planId
  )
  const coverageConflict = detectBenefitEnrollmentCoverageConflict({
    candidateStart: effectiveFrom,
    existing: existingCoverage,
  })
  if (coverageConflict) {
    const message =
      describeBenefitEnrollmentCoverageConflict(coverageConflict)
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
  if (!eligibility.result.eligible) {
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

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmBenefitEnrollment)
      .values({
        organizationId,
        benefitId: data.planId,
        employeeId: data.employeeId,
        state: "pending",
        coverageLevel: data.coverageLevel,
        effectiveFrom,
        employerContributionAmount: toMoneyString(
          data.employerContributionAmount
        ),
        employeeContributionAmount: toMoneyString(
          data.employeeContributionAmount
        ),
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmBenefitEnrollment.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        form: "This employee already has a pending or active enrollment for this benefit plan.",
      })
    }
    return hrmActionFailure({ form: "Could not create enrollment." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.benefit.enroll",
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
      },
    })
  )

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
      action: "erp.hrm.benefit.enrollment.activate",
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
      action: "erp.hrm.benefit.enrollment.waive",
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
      terminatedAt: "Termination date cannot be before enrollment coverage starts.",
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
      action: "erp.hrm.benefit.enrollment.terminate",
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
