"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmBenefit,
  hrmBenefitEnrollment,
  hrmBenefitLifeEvent,
} from "#lib/db/schema"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { evaluateBenefitEligibilityForEmployee } from "../../../payroll-compensation/benefits-administration/data/benefit-enterprise.queries.server"
import {
  describeBenefitEnrollmentCoverageConflict,
  detectBenefitEnrollmentCoverageConflict,
} from "../../../payroll-compensation/benefits-administration/data/benefit-enrollment-guard.shared"
import { summarizeBenefitEligibilityFailure } from "../../../payroll-compensation/benefits-administration/data/benefit-eligibility.shared"
import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { HRM_ESS_AUDIT } from "../ess.contract"
import {
  getBenefitEnrollmentForOrganization,
  listBenefitEnrollmentCoverageRowsForEmployeePlan,
} from "../../../payroll-compensation/benefits-administration/data/benefit.queries.server"
import {
  portalEnrollBenefitSchema,
  portalRecordLifeEventSchema,
  portalWaiveBenefitEnrollmentSchema,
} from "../../../payroll-compensation/benefits-administration/schemas/benefit.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  BenefitEnrollFormState,
  BenefitEnrollmentTransitionFormState,
  RecordLifeEventFormState,
} from "../../../types"

function revalidateBenefitsPortal() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/benefits"), "page")
}

function parseIsoDateStart(iso: string | undefined): Date {
  const d = iso ?? new Date().toISOString().slice(0, 10)
  return new Date(`${d}T12:00:00.000Z`)
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

export async function submitEmployeePortalEnrollBenefit(
  _prev: BenefitEnrollFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = portalEnrollBenefitSchema.safeParse({
    planId: formData.get("planId"),
    coverageLevel: formData.get("coverageLevel"),
    effectiveFrom: formData.get("effectiveFrom") || undefined,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      planId: fe.planId?.[0],
      coverageLevel: fe.coverageLevel?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { organizationId, userId, sessionId } = context.portal
  const employeeId = context.employee.id
  const data = parsed.data

  const [plan] = await db
    .select({ id: hrmBenefit.id, isActive: hrmBenefit.isActive })
    .from(hrmBenefit)
    .where(
      and(
        eq(hrmBenefit.organizationId, organizationId),
        eq(hrmBenefit.id, data.planId)
      )
    )
    .limit(1)

  if (!plan) {
    return hrmActionFailure({ planId: "Benefit plan not found." })
  }
  if (!plan.isActive) {
    return hrmActionFailure({
      planId: "Cannot enroll into an inactive benefit plan.",
    })
  }

  const effectiveFrom = parseIsoDateStart(data.effectiveFrom)
  const existingCoverage =
    await listBenefitEnrollmentCoverageRowsForEmployeePlan(
      organizationId,
      employeeId,
      data.planId
    )
  const coverageConflict = detectBenefitEnrollmentCoverageConflict({
    candidateStart: effectiveFrom,
    existing: existingCoverage,
  })
  if (coverageConflict) {
    const message = describeBenefitEnrollmentCoverageConflict(coverageConflict)
    return hrmActionFailure({ effectiveFrom: message, form: message })
  }

  const eligibility = await evaluateBenefitEligibilityForEmployee({
    organizationId,
    employeeId,
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
    const failure = summarizeBenefitEligibilityFailure(eligibility.result)
    return hrmActionFailure({ form: failure ?? undefined })
  }

  return withEmployeePortalActionSpan(
    context,
    "benefits",
    "enroll",
    async () => {
      let row: { id: string }
      try {
        ;[row] = await db
          .insert(hrmBenefitEnrollment)
          .values({
            organizationId,
            benefitId: data.planId,
            employeeId,
            state: "pending",
            coverageLevel: data.coverageLevel,
            effectiveFrom,
            createdByUserId: userId,
            updatedByUserId: userId,
          })
          .returning({ id: hrmBenefitEnrollment.id })
      } catch (err) {
        if (isUniqueViolation(err)) {
          return hrmActionFailure({
            form: "You already have a pending or active enrollment for this plan.",
          })
        }
        throw err
      }

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: HRM_ESS_AUDIT.benefit.enroll,
          actorUserId: userId,
          actorSessionId: sessionId,
          organizationId,
          resourceType: "hrm_benefit_enrollment",
          resourceId: row.id,
          metadata: { source: "self_service", planId: data.planId },
        })
      )

      revalidateBenefitsPortal()
      return { ok: true, enrollmentId: row.id }
    }
  )
}

export async function submitEmployeePortalCancelPendingEnrollment(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = portalWaiveBenefitEnrollmentSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid enrollment." })
  }

  const enrollment = await getBenefitEnrollmentForOrganization(
    context.portal.organizationId,
    parsed.data.enrollmentId
  )
  if (!enrollment || enrollment.employeeId !== context.employee.id) {
    return hrmActionFailure({ enrollmentId: "Enrollment not found." })
  }
  if (enrollment.state !== "pending") {
    return hrmActionFailure({
      form: "Only pending enrollments can be cancelled.",
    })
  }

  return withEmployeePortalActionSpan(
    context,
    "benefits",
    "waive",
    async () => {
      await db
        .update(hrmBenefitEnrollment)
        .set({
          state: "waived",
          waivedReason: "Cancelled by employee in portal",
          updatedByUserId: context.portal.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              hrmBenefitEnrollment.organizationId,
              context.portal.organizationId
            ),
            eq(hrmBenefitEnrollment.id, parsed.data.enrollmentId)
          )
        )

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: HRM_ESS_AUDIT.benefit.cancel,
          actorUserId: context.portal.userId,
          actorSessionId: context.portal.sessionId,
          organizationId: context.portal.organizationId,
          resourceType: "hrm_benefit_enrollment",
          resourceId: parsed.data.enrollmentId,
          metadata: { source: "self_service" },
        })
      )

      revalidateBenefitsPortal()
      return { ok: true }
    }
  )
}

export async function submitEmployeePortalRecordLifeEvent(
  _prev: RecordLifeEventFormState | undefined,
  formData: FormData
): Promise<RecordLifeEventFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = portalRecordLifeEventSchema.safeParse({
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      eventType: fe.eventType?.[0],
      eventDate: fe.eventDate?.[0],
      notes: fe.notes?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return withEmployeePortalActionSpan(
    context,
    "benefits",
    "life_event.record",
    async () => {
      const [row] = await db
        .insert(hrmBenefitLifeEvent)
        .values({
          organizationId: context.portal.organizationId,
          employeeId: context.employee.id,
          eventType: parsed.data.eventType,
          eventDate: parseIsoDateStart(parsed.data.eventDate),
          notes: parsed.data.notes?.trim() ?? null,
          verificationStatus: "pending",
          documentIds: [],
          createdByUserId: context.portal.userId,
          updatedByUserId: context.portal.userId,
        })
        .returning({ id: hrmBenefitLifeEvent.id })

      if (!row) {
        return hrmActionFailure({ form: "Could not record life event." })
      }

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: HRM_ESS_AUDIT.benefit.lifeEvent,
          actorUserId: context.portal.userId,
          actorSessionId: context.portal.sessionId,
          organizationId: context.portal.organizationId,
          resourceType: "hrm_benefit_life_event",
          resourceId: row.id,
          metadata: {
            source: "self_service",
            eventType: parsed.data.eventType,
          },
        })
      )

      revalidateBenefitsPortal()
      return { ok: true, lifeEventId: row.id }
    }
  )
}
