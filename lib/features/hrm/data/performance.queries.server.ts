import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmReview, hrmReviewCycle } from "#lib/db/schema"

import {
  hrmReviewCycleStateSchema,
  hrmReviewPipelineSchema,
  hrmReviewRowStateSchema,
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
  createdAt: Date
}

export type HrmPerformanceReviewListRow = {
  reviewId: string
  cycleId: string
  cycleName: string
  employeeId: string
  employeeLegalName: string
  employeeLinkedUserId: string | null
  reviewerId: string
  state: HrmReviewRowState
  rating: string | null
  notes: string | null
  updatedAt: Date
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
      createdAt: hrmReviewCycle.createdAt,
    })
    .from(hrmReviewCycle)
    .where(eq(hrmReviewCycle.organizationId, organizationId))
    .orderBy(desc(hrmReviewCycle.createdAt))

  return rows.map((r) => ({
    ...r,
    state: hrmReviewCycleStateSchema.parse(r.state),
    reviewPipeline: hrmReviewPipelineSchema.parse(r.reviewPipeline),
  }))
}

export async function listPerformanceReviewsForOrg(
  organizationId: string,
  limit = 50
): Promise<readonly HrmPerformanceReviewListRow[]> {
  const rows = await db
    .select({
      reviewId: hrmReview.id,
      cycleId: hrmReview.cycleId,
      cycleName: hrmReviewCycle.name,
      employeeId: hrmReview.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      employeeLinkedUserId: hrmEmployee.linkedUserId,
      reviewerId: hrmReview.reviewerId,
      state: hrmReview.state,
      rating: hrmReview.rating,
      notes: hrmReview.notes,
      updatedAt: hrmReview.updatedAt,
    })
    .from(hrmReview)
    .innerJoin(hrmReviewCycle, eq(hrmReview.cycleId, hrmReviewCycle.id))
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmReview.employeeId))
    .where(eq(hrmReview.organizationId, organizationId))
    .orderBy(desc(hrmReview.updatedAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    state: hrmReviewRowStateSchema.parse(r.state),
  }))
}
