"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull, or } from "drizzle-orm"

import {
  canUseErpPermission,
  requireErpPermission,
} from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_PERFORMANCE } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmReview, hrmReviewCycle } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/tenant"

import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"
import {
  acknowledgePerformanceReviewFormSchema,
  cancelReviewFormSchema,
  closeReviewCycleFormSchema,
  createReviewCycleFormSchema,
  HRM_REVIEW_CYCLE_INITIAL_STATE,
  HRM_REVIEW_ROW_STATE,
  hrmReviewPipelineSchema,
  initialReviewStageForPipeline,
  nextReviewStageAfterSubmit,
  normalizeReviewStage,
  reviewGenerationFormSchema,
  submitPerformanceReviewFormSchema,
  type HrmReviewPipeline,
} from "../schemas/performance.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

const PERFORMANCE_PERMISSION = {
  module: "hrm",
  object: "performance",
} as const

function revalidatePerformanceSurface() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_PERFORMANCE),
    "page"
  )
}

async function requirePerformancePermission(
  formData: FormData,
  fn: "create" | "update" | "audit"
): Promise<
  | {
      ok: true
      session: OrgSession
      orgSlug: string
    }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...PERFORMANCE_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return {
    ok: true,
    session: permission.session,
    orgSlug: tenant.orgSlug,
  }
}

async function canUpdatePerformance(input: {
  organizationId: string
  userId: string
}): Promise<boolean> {
  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      ...PERFORMANCE_PERMISSION,
      function: "update",
    },
  })
}

function parseCompetencyScores(
  raw: string | undefined
): { ok: true; value: unknown | null } | { ok: false; message: string } {
  const trimmed = raw?.trim()
  if (!trimmed) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown }
  } catch {
    return { ok: false, message: "Competency scores must be valid JSON." }
  }
}

export async function createReviewCycleAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requirePerformancePermission(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

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

export async function activateReviewCycleAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requirePerformancePermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

  const parsed = reviewGenerationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    cycleId: formData.get("cycleId"),
    fallbackReviewerUserId: formData.get("fallbackReviewerUserId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid review generation request." })
  }

  const [cycle] = await db
    .select({
      id: hrmReviewCycle.id,
      name: hrmReviewCycle.name,
      state: hrmReviewCycle.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
    })
    .from(hrmReviewCycle)
    .where(
      and(
        eq(hrmReviewCycle.organizationId, organizationId),
        eq(hrmReviewCycle.id, parsed.data.cycleId)
      )
    )
    .limit(1)

  if (!cycle) return hrmActionFailure({ form: "Review cycle not found." })
  if (cycle.state !== "draft") {
    return hrmActionFailure({
      form: "Only draft review cycles can be activated.",
    })
  }

  const pipelineParse = hrmReviewPipelineSchema.safeParse(cycle.reviewPipeline)
  const pipeline: HrmReviewPipeline = pipelineParse.success
    ? pipelineParse.data
    : "single"

  const employees = await db
    .select({
      id: hrmEmployee.id,
      legalName: hrmEmployee.legalName,
      linkedUserId: hrmEmployee.linkedUserId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.employmentStatus, "active"),
        isNull(hrmEmployee.archivedAt)
      )
    )

  if (employees.length === 0) {
    return hrmActionFailure({
      form: "No active employees are available for review generation.",
    })
  }

  const fallbackReviewerUserId = parsed.data.fallbackReviewerUserId
  if (fallbackReviewerUserId) {
    const fallbackAllowed = await canUpdatePerformance({
      organizationId,
      userId: fallbackReviewerUserId,
    })
    if (!fallbackAllowed) {
      return hrmActionFailure({
        form: "Fallback reviewer must have HRM performance update permission.",
      })
    }
  }

  const employeesById = new Map(
    employees.map((employee) => [employee.id, employee])
  )
  const missingReviewerEmployees: string[] = []
  const initialStage = initialReviewStageForPipeline(pipeline)

  const reviewRows = employees.map((employee) => {
    const managerUserId =
      employee.managerEmployeeId === null
        ? null
        : (employeesById.get(employee.managerEmployeeId)?.linkedUserId ?? null)
    const reviewerId = managerUserId ?? fallbackReviewerUserId ?? null
    if (!reviewerId) {
      missingReviewerEmployees.push(employee.legalName)
    }
    return {
      id: crypto.randomUUID(),
      organizationId,
      cycleId: cycle.id,
      employeeId: employee.id,
      reviewerId: reviewerId ?? userId,
      state: initialStage,
      ratingScale: "text",
    }
  })

  if (missingReviewerEmployees.length > 0) {
    return hrmActionFailure({
      form: `Fallback reviewer required for: ${missingReviewerEmployees
        .slice(0, 5)
        .join(", ")}${missingReviewerEmployees.length > 5 ? ", ..." : ""}.`,
    })
  }

  const now = new Date()
  const generated = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(hrmReview)
      .values(reviewRows)
      .onConflictDoNothing({
        target: [hrmReview.cycleId, hrmReview.employeeId],
      })
      .returning({ id: hrmReview.id })

    await tx
      .update(hrmReviewCycle)
      .set({
        state: "active",
        activatedAt: now,
        activatedByUserId: userId,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(
        and(
          eq(hrmReviewCycle.organizationId, organizationId),
          eq(hrmReviewCycle.id, cycle.id)
        )
      )

    return inserted.length
  })

  after(() => {
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.generate",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review_cycle",
      resourceId: cycle.id,
      metadata: { generated, pipeline },
    })
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.cycle.activate",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review_cycle",
      resourceId: cycle.id,
      metadata: { name: cycle.name, generated },
    })
  })

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function closeReviewCycleAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requirePerformancePermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

  const parsed = closeReviewCycleFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    cycleId: formData.get("cycleId"),
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid cycle." })

  const [cycle] = await db
    .select({ id: hrmReviewCycle.id, state: hrmReviewCycle.state })
    .from(hrmReviewCycle)
    .where(
      and(
        eq(hrmReviewCycle.organizationId, organizationId),
        eq(hrmReviewCycle.id, parsed.data.cycleId)
      )
    )
    .limit(1)
  if (!cycle) return hrmActionFailure({ form: "Review cycle not found." })
  if (cycle.state !== "active") {
    return hrmActionFailure({ form: "Only active cycles can be closed." })
  }

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .update(hrmReviewCycle)
      .set({
        state: "closed",
        closedAt: now,
        closedByUserId: userId,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(
        and(
          eq(hrmReviewCycle.organizationId, organizationId),
          eq(hrmReviewCycle.id, cycle.id)
        )
      )

    await tx
      .update(hrmReview)
      .set({
        state: HRM_REVIEW_ROW_STATE.closed,
        closedAt: now,
        closedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmReview.organizationId, organizationId),
          eq(hrmReview.cycleId, cycle.id),
          or(
            eq(hrmReview.state, HRM_REVIEW_ROW_STATE.selfPending),
            eq(hrmReview.state, HRM_REVIEW_ROW_STATE.managerPending),
            eq(hrmReview.state, HRM_REVIEW_ROW_STATE.hrPending),
            eq(hrmReview.state, HRM_REVIEW_ROW_STATE.submitted),
            eq(hrmReview.state, HRM_REVIEW_ROW_STATE.acknowledged),
            eq(hrmReview.state, "pending")
          )
        )
      )
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.cycle.close",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review_cycle",
      resourceId: cycle.id,
      metadata: { cycleId: cycle.id },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function submitReviewStageAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return tenant.response
  const { session } = tenant
  const { organizationId, userId, sessionId } = session

  const parsed = submitPerformanceReviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    reviewId: formData.get("reviewId"),
    rating: formData.get("rating"),
    notes: formData.get("notes"),
    competencyScoresJson: formData.get("competencyScoresJson"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.reviewId?.[0] })
  }

  const competencyScores = parseCompetencyScores(
    parsed.data.competencyScoresJson
  )
  if (!competencyScores.ok) {
    return hrmActionFailure({ form: competencyScores.message })
  }

  const [ctx] = await db
    .select({
      id: hrmReview.id,
      employeeId: hrmReview.employeeId,
      reviewerId: hrmReview.reviewerId,
      state: hrmReview.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
      cycleState: hrmReviewCycle.state,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReviewCycle.id, hrmReview.cycleId))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )
    .limit(1)

  if (!ctx) return hrmActionFailure({ form: "Review not found." })
  if (ctx.cycleState !== "active") {
    return hrmActionFailure({
      form: "Only reviews in active cycles can be submitted.",
    })
  }

  const pipelineParse = hrmReviewPipelineSchema.safeParse(ctx.reviewPipeline)
  const pipeline: HrmReviewPipeline = pipelineParse.success
    ? pipelineParse.data
    : "single"
  const currentStage = normalizeReviewStage(ctx.state, pipeline)
  if (!currentStage) {
    return hrmActionFailure({ form: "Review data is inconsistent." })
  }
  const nextStage = nextReviewStageAfterSubmit({
    currentStage,
    pipeline,
  })
  if (!nextStage) {
    return hrmActionFailure({
      form: "This review stage cannot be submitted.",
    })
  }

  const canUpdate = await canUpdatePerformance({ organizationId, userId })
  const canSelf = ctx.linkedUserId !== null && ctx.linkedUserId === userId
  const canManager = ctx.reviewerId === userId
  const allowed =
    canUpdate ||
    (currentStage === HRM_REVIEW_ROW_STATE.selfPending && canSelf) ||
    (currentStage === HRM_REVIEW_ROW_STATE.managerPending && canManager)

  if (!allowed) {
    return hrmActionFailure({
      form: "You are not assigned to submit this review stage.",
    })
  }

  if (currentStage === HRM_REVIEW_ROW_STATE.hrPending && !canUpdate) {
    return hrmActionFailure({
      form: "HR calibration requires performance update permission.",
    })
  }

  const now = new Date()
  const trimmedRating = parsed.data.rating?.trim() || null
  const trimmedNotes = parsed.data.notes?.trim() || null
  const competencyPayload = competencyScores.value

  const stagePatch: Partial<typeof hrmReview.$inferInsert> = {
    state: nextStage,
    updatedAt: now,
  }
  if (competencyPayload !== null) {
    stagePatch.competencyScoresJson = competencyPayload
  }

  if (currentStage === HRM_REVIEW_ROW_STATE.selfPending) {
    stagePatch.selfRating = trimmedRating
    stagePatch.selfNotes = trimmedNotes
    stagePatch.selfSubmittedAt = now
  } else if (currentStage === HRM_REVIEW_ROW_STATE.managerPending) {
    stagePatch.managerRating = trimmedRating
    stagePatch.managerNotes = trimmedNotes
    stagePatch.managerSubmittedAt = now
    if (nextStage === HRM_REVIEW_ROW_STATE.submitted) {
      stagePatch.rating = trimmedRating
      stagePatch.notes = trimmedNotes
    }
  } else if (currentStage === HRM_REVIEW_ROW_STATE.hrPending) {
    stagePatch.hrRating = trimmedRating
    stagePatch.hrNotes = trimmedNotes
    stagePatch.hrSubmittedAt = now
    stagePatch.rating = trimmedRating
    stagePatch.notes = trimmedNotes
  }

  await db
    .update(hrmReview)
    .set(stagePatch)
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.submit",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review",
      resourceId: parsed.data.reviewId,
      metadata: {
        employeeId: ctx.employeeId,
        pipeline,
        fromStage: currentStage,
        toStage: nextStage,
      },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function submitReviewAction(
  prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  return submitReviewStageAction(prev, formData)
}

export async function acknowledgeReviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return tenant.response
  const { session } = tenant
  const { organizationId, userId, sessionId } = session

  const parsed = acknowledgePerformanceReviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    reviewId: formData.get("reviewId"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.reviewId?.[0] })
  }

  const [row] = await db
    .select({
      id: hrmReview.id,
      employeeId: hrmReview.employeeId,
      state: hrmReview.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReviewCycle.id, hrmReview.cycleId))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )
    .limit(1)

  if (!row) return hrmActionFailure({ form: "Review not found." })

  const pipelineParse = hrmReviewPipelineSchema.safeParse(row.reviewPipeline)
  const pipeline: HrmReviewPipeline = pipelineParse.success
    ? pipelineParse.data
    : "single"
  const rowState = normalizeReviewStage(row.state, pipeline)
  if (rowState !== HRM_REVIEW_ROW_STATE.submitted) {
    return hrmActionFailure({
      form: "Only submitted reviews can be acknowledged.",
    })
  }

  const isSubject = row.linkedUserId === userId
  const canUpdate = await canUpdatePerformance({ organizationId, userId })
  if (!isSubject && !canUpdate) {
    return hrmActionFailure({
      form: "Only the reviewed employee or HRM performance admins can acknowledge.",
    })
  }

  await db
    .update(hrmReview)
    .set({
      state: HRM_REVIEW_ROW_STATE.acknowledged,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.acknowledge",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review",
      resourceId: parsed.data.reviewId,
      metadata: { employeeId: row.employeeId },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}

export async function cancelReviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requirePerformancePermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

  const parsed = cancelReviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    reviewId: formData.get("reviewId"),
    reason: formData.get("reason") || undefined,
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid review." })

  const [row] = await db
    .select({
      id: hrmReview.id,
      state: hrmReview.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReviewCycle.id, hrmReview.cycleId))
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )
    .limit(1)

  if (!row) return hrmActionFailure({ form: "Review not found." })
  const pipelineParse = hrmReviewPipelineSchema.safeParse(row.reviewPipeline)
  const pipeline: HrmReviewPipeline = pipelineParse.success
    ? pipelineParse.data
    : "single"
  const stage = normalizeReviewStage(row.state, pipeline)
  if (
    stage === HRM_REVIEW_ROW_STATE.closed ||
    stage === HRM_REVIEW_ROW_STATE.cancelled
  ) {
    return hrmActionFailure({ form: "This review is already final." })
  }

  await db
    .update(hrmReview)
    .set({
      state: HRM_REVIEW_ROW_STATE.cancelled,
      cancelledAt: new Date(),
      cancelledByUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmReview.organizationId, organizationId),
        eq(hrmReview.id, parsed.data.reviewId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.performance.review.cancel",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_review",
      resourceId: parsed.data.reviewId,
      metadata: { reason: parsed.data.reason?.trim() || null },
    })
  )

  revalidatePerformanceSurface()
  return { ok: true }
}
