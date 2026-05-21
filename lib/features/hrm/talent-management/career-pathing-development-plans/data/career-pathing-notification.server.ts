import "server-only"

import { and, eq } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import {
  hrmDevelopmentGoal,
  hrmDevelopmentMilestone,
  hrmDevelopmentPlan,
  hrmEmployee,
} from "#lib/db/schema"
import { organizationHrmPath } from "../../../constants"

export type CareerPathLifecycleEvent =
  | "milestone_overdue"
  | "goal_completed"
  | "discussion_scheduled"

const EVENT_TITLE: Record<CareerPathLifecycleEvent, string> = {
  milestone_overdue: "Development milestone overdue",
  goal_completed: "Development goal completed",
  discussion_scheduled: "Career discussion recorded",
}

async function resolveCareerPathLinkedPath(
  organizationId: string
): Promise<string> {
  const slug = await getOrganizationSlugById(organizationId)
  if (!slug) return "/apps/hrm/career-pathing"
  return organizationHrmPath(slug, "career-pathing")
}

/**
 * In-app notification for career-pathing lifecycle events.
 * Best-effort — never throws after a successful DB commit.
 */
export async function notifyCareerPathLifecycle(input: {
  readonly organizationId: string
  readonly targetUserId: string | null
  readonly event: CareerPathLifecycleEvent
  readonly resourceId: string
  readonly resourceLabel: string
  readonly bodyDetail?: string | null
}): Promise<void> {
  if (!input.targetUserId) return

  const linkedPath = await resolveCareerPathLinkedPath(input.organizationId)
  const detail = input.bodyDetail?.trim()
  const body = detail
    ? `${EVENT_TITLE[input.event]}. ${detail}`
    : `${EVENT_TITLE[input.event]}.`

  try {
    await publishOrgNotificationIfMissing({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      title: EVENT_TITLE[input.event],
      body,
      severity: input.event === "milestone_overdue" ? "warning" : "info",
      linkedEntityType: `erp.hrm.career_path.${input.event}`,
      linkedEntityId: input.resourceId,
      linkedEntityLabel: input.resourceLabel,
      linkedPath,
      expiresAt: null,
    })
  } catch {
    // Notification delivery must not roll back career-pathing mutations.
  }
}

export async function notifyCareerPathMilestoneStatusChange(input: {
  readonly organizationId: string
  readonly milestoneId: string
  readonly status: string
}): Promise<void> {
  if (input.status !== "overdue") return

  const [row] = await db
    .select({
      milestoneTitle: hrmDevelopmentMilestone.title,
      employeeId: hrmDevelopmentPlan.employeeId,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmDevelopmentMilestone)
    .innerJoin(
      hrmDevelopmentGoal,
      eq(hrmDevelopmentGoal.id, hrmDevelopmentMilestone.goalId)
    )
    .innerJoin(
      hrmDevelopmentPlan,
      eq(hrmDevelopmentPlan.id, hrmDevelopmentGoal.planId)
    )
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmDevelopmentPlan.employeeId)
    )
    .where(
      and(
        eq(hrmDevelopmentMilestone.id, input.milestoneId),
        eq(hrmDevelopmentMilestone.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!row) return

  await notifyCareerPathLifecycle({
    organizationId: input.organizationId,
    targetUserId: row.linkedUserId,
    event: "milestone_overdue",
    resourceId: input.milestoneId,
    resourceLabel: row.milestoneTitle,
    bodyDetail: `Employee plan milestone requires attention.`,
  })
}

export async function notifyCareerPathGoalStatusChange(input: {
  readonly organizationId: string
  readonly goalId: string
  readonly status: string
}): Promise<void> {
  if (input.status !== "completed") return

  const [row] = await db
    .select({
      goalTitle: hrmDevelopmentGoal.title,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmDevelopmentGoal)
    .innerJoin(
      hrmDevelopmentPlan,
      eq(hrmDevelopmentPlan.id, hrmDevelopmentGoal.planId)
    )
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmDevelopmentPlan.employeeId)
    )
    .where(
      and(
        eq(hrmDevelopmentGoal.id, input.goalId),
        eq(hrmDevelopmentGoal.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!row) return

  await notifyCareerPathLifecycle({
    organizationId: input.organizationId,
    targetUserId: row.linkedUserId,
    event: "goal_completed",
    resourceId: input.goalId,
    resourceLabel: row.goalTitle,
  })
}

export async function notifyCareerPathDiscussionCreated(input: {
  readonly organizationId: string
  readonly discussionId: string
  readonly employeeId: string
}): Promise<void> {
  const [row] = await db
    .select({ linkedUserId: hrmEmployee.linkedUserId })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.id, input.employeeId),
        eq(hrmEmployee.organizationId, input.organizationId)
      )
    )
    .limit(1)

  await notifyCareerPathLifecycle({
    organizationId: input.organizationId,
    targetUserId: row?.linkedUserId ?? null,
    event: "discussion_scheduled",
    resourceId: input.discussionId,
    resourceLabel: "Career discussion",
  })
}
