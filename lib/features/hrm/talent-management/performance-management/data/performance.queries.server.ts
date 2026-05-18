import "server-only"

import { alias } from "drizzle-orm/pg-core"
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmReview, hrmReviewCycle } from "#lib/db/schema"

import {
  hrmReviewCycleStateSchema,
  hrmReviewPipelineSchema,
  normalizeReviewStage,
  type HrmReviewCycleState,
  type HrmReviewPipeline,
  type HrmReviewRowState,
} from "../schemas/performance.schema"

export type HrmReviewCycleRow = {
  id: string
  name: string
  periodStart: Date
  periodEnd: Date
  state: HrmReviewCycleState
  reviewPipeline: HrmReviewPipeline
  activatedAt: Date | null
  closedAt: Date | null
  createdAt: Date
}

const hrmReviewerEmployee = alias(hrmEmployee, "hrm_reviewer_employee")

export type HrmPerformanceReviewListRow = {
  reviewId: string
  cycleId: string
  cycleName: string
  cycleState: HrmReviewCycleState
  reviewPipeline: HrmReviewPipeline
  employeeId: string
  employeeLegalName: string
  employeeLinkedUserId: string | null
  reviewerId: string
  reviewerLegalName: string | null
  reviewerEmployeeNumber: string | null
  state: HrmReviewRowState
  rating: string | null
  notes: string | null
  selfSubmittedAt: Date | null
  managerSubmittedAt: Date | null
  hrSubmittedAt: Date | null
  updatedAt: Date
}

export type HrmPerformanceReviewerChoiceRow = {
  employeeId: string
  employeeNumber: string
  legalName: string
  linkedUserId: string
}

export async function listReviewCyclesForOrg(
  organizationId: string
): Promise<readonly HrmReviewCycleRow[]> {
  const rows = await db
    .select({
      id: hrmReviewCycle.id,
      name: hrmReviewCycle.name,
      periodStart: hrmReviewCycle.periodStart,
      periodEnd: hrmReviewCycle.periodEnd,
      state: hrmReviewCycle.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
      activatedAt: hrmReviewCycle.activatedAt,
      closedAt: hrmReviewCycle.closedAt,
      createdAt: hrmReviewCycle.createdAt,
    })
    .from(hrmReviewCycle)
    .where(eq(hrmReviewCycle.organizationId, organizationId))
    .orderBy(desc(hrmReviewCycle.createdAt))

  return rows.map((row) => ({
    ...row,
    state: hrmReviewCycleStateSchema.parse(row.state),
    reviewPipeline: hrmReviewPipelineSchema.parse(row.reviewPipeline),
  }))
}

export async function listPerformanceReviewsForOrg(
  organizationId: string,
  limit = 100
): Promise<readonly HrmPerformanceReviewListRow[]> {
  const rows = await db
    .select({
      reviewId: hrmReview.id,
      cycleId: hrmReview.cycleId,
      cycleName: hrmReviewCycle.name,
      cycleState: hrmReviewCycle.state,
      reviewPipeline: hrmReviewCycle.reviewPipeline,
      employeeId: hrmReview.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      employeeLinkedUserId: hrmEmployee.linkedUserId,
      reviewerId: hrmReview.reviewerId,
      reviewerLegalName: hrmReviewerEmployee.legalName,
      reviewerEmployeeNumber: hrmReviewerEmployee.employeeNumber,
      state: hrmReview.state,
      rating: hrmReview.rating,
      notes: hrmReview.notes,
      selfSubmittedAt: hrmReview.selfSubmittedAt,
      managerSubmittedAt: hrmReview.managerSubmittedAt,
      hrSubmittedAt: hrmReview.hrSubmittedAt,
      updatedAt: hrmReview.updatedAt,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReview.cycleId, hrmReviewCycle.id))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .leftJoin(
      hrmReviewerEmployee,
      eq(hrmReviewerEmployee.linkedUserId, hrmReview.reviewerId)
    )
    .where(eq(hrmReview.organizationId, organizationId))
    .orderBy(desc(hrmReview.updatedAt))
    .limit(limit)

  return rows.map((row) => {
    const pipeline = hrmReviewPipelineSchema.parse(row.reviewPipeline)
    const state = normalizeReviewStage(row.state, pipeline)
    if (!state) {
      throw new Error(`Invalid HRM review stage: ${row.state}`)
    }
    return {
      ...row,
      cycleState: hrmReviewCycleStateSchema.parse(row.cycleState),
      reviewPipeline: pipeline,
      state,
    }
  })
}

export async function listPerformanceReviewerChoicesForOrg(
  organizationId: string
): Promise<readonly HrmPerformanceReviewerChoiceRow[]> {
  const rows = await db
    .select({
      employeeId: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.employmentStatus, "active"),
        isNull(hrmEmployee.archivedAt),
        isNotNull(hrmEmployee.linkedUserId)
      )
    )
    .orderBy(asc(hrmEmployee.legalName))

  return rows.map((row) => ({
    ...row,
    linkedUserId: row.linkedUserId ?? "",
  }))
}
