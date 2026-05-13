"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { ORG_DASHBOARD_HRM_PERFORMANCE } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmReview, hrmReviewCycle } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { isoDateOnlyToUtcDate } from "../data/hrm-calendar-dates.server"
import {
  acknowledgePerformanceReviewFormSchema,
  createReviewCycleFormSchema,
  HRM_REVIEW_CYCLE_INITIAL_STATE,
  HRM_REVIEW_ROW_STATE,
  hrmReviewPipelineSchema,
  hrmReviewRowStateSchema,
  submitPerformanceReviewFormSchema,
} from "../schemas/performance.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidatePerformanceSurface() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_PERFORMANCE),
    "page"
  )
}

export async function createReviewCycleAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const admin = await requireHrmAdmin()
  if (!admin.ok) {
    return hrmActionFailure({ form: admin.error })
  }

  const parsed = createReviewCycleFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    name: formData.get("name"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    reviewPipeline: formData.get("reviewPipeline") || undefined,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form:
        fe.name?.[0] ??
        fe.periodStart?.[0] ??
        fe.periodEnd?.[0] ??
        "Invalid review cycle.",
    })
  }

  const { name, periodStart, periodEnd, reviewPipeline } = parsed.data
  const pipeline = reviewPipeline ?? "single"
  const id = crypto.randomUUID()

  await db.insert(hrmReviewCycle).values({
    id,
    organizationId,
    name,
    periodStart: isoDateOnlyToUtcDate(periodStart),
    periodEnd: isoDateOnlyToUtcDate(periodEnd),
    state: HRM_REVIEW_CYCLE_INITIAL_STATE,
    reviewPipeline: hrmReviewPipelineSchema.safeParse(pipeline).success
      ? pipeline
      : "single",
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.cycle.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review_cycle",
      resourceId: id,
      metadata: { name, reviewPipeline: pipeline },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function submitReviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  const parsed = submitPerformanceReviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    reviewId: formData.get("reviewId"),
    rating: formData.get("rating"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.reviewId?.[0] })
  }

  const { reviewId, rating, notes } = parsed.data

  const [ctx] = await db
    .select({
      id: hrmReview.id,
      reviewerId: hrmReview.reviewerId,
      state: hrmReview.state,
      selfSubmittedAt: hrmReview.selfSubmittedAt,
      managerSubmittedAt: hrmReview.managerSubmittedAt,
      hrSubmittedAt: hrmReview.hrSubmittedAt,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReviewCycle.id, hrmReview.cycleId))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, reviewId)
      )
    )
    .limit(1)

  if (!ctx) {
    return hrmActionFailure({ form: "Review not found." })
  }

  const rowState = hrmReviewRowStateSchema.safeParse(ctx.state)
  if (!rowState.success) {
    return hrmActionFailure({ form: "Review data is inconsistent." })
  }
  if (rowState.data !== HRM_REVIEW_ROW_STATE.pending) {
    return hrmActionFailure({ form: "Only pending reviews can be submitted." })
  }

  const pipelineParse = hrmReviewPipelineSchema.safeParse(ctx.reviewPipeline)
  const pipeline = pipelineParse.success ? pipelineParse.data : "single"

  const isAdmin = await canActInOrganization(
    userId,
    user.role,
    organizationId,
    "admin"
  )

  const now = new Date()
  const trimmedRating = rating?.trim() ? rating.trim() : null
  const trimmedNotes = notes?.trim() ? notes.trim() : null

  if (pipeline === "three_stage") {
    const canSelf =
      (ctx.linkedUserId !== null && ctx.linkedUserId === userId) || isAdmin
    const canManager = ctx.reviewerId === userId || isAdmin

    if (!ctx.selfSubmittedAt) {
      if (!canSelf) {
        return hrmActionFailure({
          form: "Only the reviewed employee (linked account) or an admin can submit the self review.",
        })
      }
      await db
        .update(hrmReview)
        .set({
          selfRating: trimmedRating,
          selfNotes: trimmedNotes,
          selfSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(hrmReview.id, reviewId))
    } else if (!ctx.managerSubmittedAt) {
      if (!canManager) {
        return hrmActionFailure({
          form: "Only the assigned manager reviewer (or an admin) can submit the manager review.",
        })
      }
      await db
        .update(hrmReview)
        .set({
          managerRating: trimmedRating,
          managerNotes: trimmedNotes,
          managerSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(hrmReview.id, reviewId))
    } else if (!ctx.hrSubmittedAt) {
      if (!isAdmin) {
        return hrmActionFailure({
          form: "Only an org admin can submit the HR calibration for this review.",
        })
      }
      await db
        .update(hrmReview)
        .set({
          hrRating: trimmedRating,
          hrNotes: trimmedNotes,
          hrSubmittedAt: now,
          rating: trimmedRating,
          notes: trimmedNotes,
          state: HRM_REVIEW_ROW_STATE.submitted,
          updatedAt: now,
        })
        .where(eq(hrmReview.id, reviewId))
    } else {
      return hrmActionFailure({ form: "This review is already complete." })
    }
  } else {
    const isReviewer = ctx.reviewerId === userId
    if (!isReviewer && !isAdmin) {
      return hrmActionFailure({
        form: "Only the assigned reviewer (or an org admin) can submit this review.",
      })
    }

    await db
      .update(hrmReview)
      .set({
        state: HRM_REVIEW_ROW_STATE.submitted,
        rating: trimmedRating,
        notes: trimmedNotes,
        updatedAt: now,
      })
      .where(eq(hrmReview.id, reviewId))
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.submit",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review",
      resourceId: reviewId,
      metadata: { pipeline },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function acknowledgeReviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  const parsed = acknowledgePerformanceReviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    reviewId: formData.get("reviewId"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.reviewId?.[0] })
  }

  const { reviewId } = parsed.data

  const [row] = await db
    .select({
      id: hrmReview.id,
      employeeId: hrmReview.employeeId,
      state: hrmReview.state,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmReview)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, reviewId)
      )
    )
    .limit(1)

  if (!row) {
    return hrmActionFailure({ form: "Review not found." })
  }

  const rowState = hrmReviewRowStateSchema.safeParse(row.state)
  if (!rowState.success) {
    return hrmActionFailure({ form: "Review data is inconsistent." })
  }
  if (rowState.data !== HRM_REVIEW_ROW_STATE.submitted) {
    return hrmActionFailure({
      form: "Only submitted reviews can be acknowledged.",
    })
  }

  const isSubject = row.linkedUserId === userId
  const isAdmin = await canActInOrganization(
    userId,
    user.role,
    organizationId,
    "admin"
  )
  if (!isSubject && !isAdmin) {
    return hrmActionFailure({
      form: "Only the reviewed employee (linked user) or an org admin can acknowledge.",
    })
  }

  await db
    .update(hrmReview)
    .set({
      state: HRM_REVIEW_ROW_STATE.acknowledged,
      updatedAt: new Date(),
    })
    .where(eq(hrmReview.id, reviewId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.acknowledge",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review",
      resourceId: reviewId,
      metadata: { employeeId: row.employeeId },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}
