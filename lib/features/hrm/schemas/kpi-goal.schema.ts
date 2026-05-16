import { z } from "zod"

export const KPI_GOAL_STATUSES = ["in_progress", "completed", "closed"] as const

export type KpiGoalStatus = (typeof KPI_GOAL_STATUSES)[number]

export const kpiGoalStatusSchema = z.enum(KPI_GOAL_STATUSES)

const uuidLike = z.string().uuid()

export const createKpiGoalFormSchema = z.object({
  orgSlug: z.string().min(1),
  ownerEmployeeId: uuidLike,
  title: z.string().min(1).max(500),
  description: z.string().max(8000).optional().nullable(),
  dueDate: z.string().min(1),
  alignsWithGoalId: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
  sharedWithEmployeeIds: z.array(uuidLike).optional(),
})

export const updateKpiGoalFormSchema = z.object({
  orgSlug: z.string().min(1),
  goalId: uuidLike,
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(8000).optional().nullable(),
  dueDate: z.string().min(1).optional(),
  percentComplete: z.coerce.number().int().min(0).max(100).optional(),
  alignsWithGoalId: uuidLike.optional().nullable(),
  sharedWithEmployeeIds: z.array(uuidLike).optional(),
})

export const closeKpiGoalFormSchema = z.object({
  orgSlug: z.string().min(1),
  goalId: uuidLike,
})

export const deleteKpiGoalFormSchema = z.object({
  orgSlug: z.string().min(1),
  goalId: uuidLike,
})

export const addKpiGoalMilestoneFormSchema = z.object({
  orgSlug: z.string().min(1),
  goalId: uuidLike,
  title: z.string().min(1).max(500),
  sortOrder: z.coerce.number().int().optional(),
  startValue: z.string().optional().nullable(),
  endValue: z.string().optional().nullable(),
  currentValue: z.string().optional().nullable(),
})

export const updateKpiGoalMilestoneFormSchema = z.object({
  orgSlug: z.string().min(1),
  milestoneId: uuidLike,
  title: z.string().min(1).max(500).optional(),
  sortOrder: z.coerce.number().int().optional(),
  startValue: z.string().optional().nullable(),
  endValue: z.string().optional().nullable(),
  currentValue: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
})

export const removeKpiGoalMilestoneFormSchema = z.object({
  orgSlug: z.string().min(1),
  milestoneId: uuidLike,
})

export const postKpiGoalCommentFormSchema = z.object({
  orgSlug: z.string().min(1),
  goalId: uuidLike,
  text: z.string().min(1).max(8000),
})

export const deleteKpiGoalCommentFormSchema = z.object({
  orgSlug: z.string().min(1),
  commentId: uuidLike,
})

export type KpiGoalMilestoneLike = {
  readonly completedAt: Date | null
  readonly startValue: string | null
  readonly endValue: string | null
  readonly currentValue: string | null
}

/**
 * Derives a 0–100 completion percent from milestones: fully weighted mix of
 * explicit `completedAt` and numeric progress between `startValue` and `endValue`.
 */
export function derivePercentCompleteFromMilestones(
  milestones: readonly KpiGoalMilestoneLike[]
): number {
  if (milestones.length === 0) return 0
  let sum = 0
  for (const m of milestones) {
    if (m.completedAt) {
      sum += 1
      continue
    }
    const start = m.startValue !== null ? Number(m.startValue) : null
    const end = m.endValue !== null ? Number(m.endValue) : null
    const cur = m.currentValue !== null ? Number(m.currentValue) : null
    if (
      start !== null &&
      end !== null &&
      cur !== null &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      Number.isFinite(cur) &&
      end !== start
    ) {
      const t = (cur - start) / (end - start)
      sum += Math.min(1, Math.max(0, t))
    }
  }
  return Math.round((sum / milestones.length) * 100)
}

export type KpiGoalViewer = {
  readonly userId: string
  readonly employeeId: string | null
}

export type KpiGoalLike = {
  readonly ownerEmployeeId: string
  readonly sharedWithEmployeeIds: readonly string[]
}

export function canCommentOnGoal(
  goal: KpiGoalLike,
  viewer: KpiGoalViewer
): boolean {
  if (viewer.employeeId === null) return false
  if (viewer.employeeId === goal.ownerEmployeeId) return true
  return goal.sharedWithEmployeeIds.includes(viewer.employeeId)
}

export function canEditMilestone(
  goal: KpiGoalLike,
  viewer: KpiGoalViewer
): boolean {
  return canCommentOnGoal(goal, viewer)
}
