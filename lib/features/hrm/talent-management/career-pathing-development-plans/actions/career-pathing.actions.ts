"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"

import { requireErpPermission } from "#features/erp-rbac/server"
import { requireOrgSession, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_CAREER_PATHING } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import {
  hrmCareerDiscussion,
  hrmCareerPathFramework,
  hrmCareerPathStage,
  hrmDevelopmentCoachAssignment,
  hrmDevelopmentGoal,
  hrmDevelopmentLearningAction,
  hrmDevelopmentMentorAssignment,
  hrmDevelopmentMilestone,
  hrmDevelopmentPlan,
  hrmDevelopmentSession,
  hrmDevelopmentStretchAssignment,
  hrmEmployeeCareerAspiration,
  hrmEmployeeTargetRole,
} from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/auth"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_CAREER_PATH_AUDIT } from "../career-pathing.contract"
import {
  notifyCareerPathDiscussionCreated,
  notifyCareerPathGoalStatusChange,
  notifyCareerPathMilestoneStatusChange,
} from "../data/career-pathing-notification.server"
import { buildCareerPathReadinessExportCsv } from "../data/career-pathing-report.server"
import { recomputeReadinessForEmployee } from "../data/career-pathing.queries.server"
import {
  assignCoachFormSchema,
  assignMentorFormSchema,
  createCareerDiscussionFormSchema,
  createCareerPathFrameworkFormSchema,
  createCareerPathStageFormSchema,
  createDevelopmentGoalFormSchema,
  deleteCareerPathStageFormSchema,
  createDevelopmentMilestoneFormSchema,
  createDevelopmentPlanFormSchema,
  createDevelopmentSessionFormSchema,
  createLearningActionFormSchema,
  createStretchAssignmentFormSchema,
  createTargetRoleFormSchema,
  normalizeCareerPathCode,
  updateCareerPathFrameworkStatusFormSchema,
  updateDevelopmentGoalStatusFormSchema,
  updateManagerReviewFormSchema,
  updateMilestoneStatusFormSchema,
  upsertCareerAspirationFormSchema,
} from "../schemas/career-pathing.schema"
import type { CareerPathingMutationFormState } from "../schemas/career-pathing.schema"

const CAREER_PATH_PERMISSION = {
  module: "hrm",
  object: "career_path",
} as const

function revalidateCareerPathing() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_CAREER_PATHING),
    "page"
  )
}

async function requireCareerPathPermission(
  formData: FormData,
  fn: "create" | "update" | "search"
): Promise<
  | { ok: true; session: OrgSession; orgSlug: string }
  | { ok: false; response: CareerPathingMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...CAREER_PATH_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return { ok: true, session: permission.session, orgSlug: tenant.orgSlug }
}

export async function createCareerPathFrameworkAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createCareerPathFrameworkFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    pathKind: formData.get("pathKind"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid framework payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const userId = session.userId

  const [row] = await db
    .insert(hrmCareerPathFramework)
    .values({
      organizationId,
      code: normalizeCareerPathCode(parsed.data.code),
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      pathKind: parsed.data.pathKind,
      status: "draft",
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    .returning({ id: hrmCareerPathFramework.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.framework.create,
      actorUserId: userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_career_path_framework",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function updateCareerPathFrameworkStatusAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateCareerPathFrameworkStatusFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    frameworkId: formData.get("frameworkId"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid status payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  await db
    .update(hrmCareerPathFramework)
    .set({
      status: parsed.data.status,
      updatedByUserId: session.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmCareerPathFramework.id, parsed.data.frameworkId),
        eq(hrmCareerPathFramework.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.framework.update,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_career_path_framework",
      resourceId: parsed.data.frameworkId,
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createCareerPathStageAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createCareerPathStageFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    frameworkId: formData.get("frameworkId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    targetGradeRef: formData.get("targetGradeRef") || undefined,
    expectedMonths: formData.get("expectedMonths") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid stage payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [framework] = await db
    .select({ id: hrmCareerPathFramework.id })
    .from(hrmCareerPathFramework)
    .where(
      and(
        eq(hrmCareerPathFramework.id, parsed.data.frameworkId),
        eq(hrmCareerPathFramework.organizationId, organizationId)
      )
    )
    .limit(1)
  if (!framework) {
    return hrmActionFailure({ form: "Career path framework not found." })
  }

  const [seqRow] = await db
    .select({
      nextSequence: sql<number>`coalesce(max(${hrmCareerPathStage.sequence}), 0) + 1`,
    })
    .from(hrmCareerPathStage)
    .where(
      and(
        eq(hrmCareerPathStage.organizationId, organizationId),
        eq(hrmCareerPathStage.frameworkId, parsed.data.frameworkId)
      )
    )

  const sequence = Number(seqRow?.nextSequence ?? 1)

  const [row] = await db
    .insert(hrmCareerPathStage)
    .values({
      organizationId,
      frameworkId: parsed.data.frameworkId,
      sequence,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      targetGradeRef: parsed.data.targetGradeRef ?? null,
      expectedMonths: parsed.data.expectedMonths ?? null,
    })
    .returning({ id: hrmCareerPathStage.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.stage.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_career_path_stage",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function deleteCareerPathStageAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = deleteCareerPathStageFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    stageId: formData.get("stageId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid stage delete payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  await db
    .delete(hrmCareerPathStage)
    .where(
      and(
        eq(hrmCareerPathStage.id, parsed.data.stageId),
        eq(hrmCareerPathStage.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.stage.deprecate,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_career_path_stage",
      resourceId: parsed.data.stageId,
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function upsertCareerAspirationAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = upsertCareerAspirationFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    preferredRoleTitle: formData.get("preferredRoleTitle") || undefined,
    preferredDepartmentRef: formData.get("preferredDepartmentRef") || undefined,
    preferredLocationRef: formData.get("preferredLocationRef") || undefined,
    mobilityPreference: formData.get("mobilityPreference") || undefined,
    notes: formData.get("notes") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid aspiration payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const data = parsed.data

  await db
    .insert(hrmEmployeeCareerAspiration)
    .values({
      organizationId,
      employeeId: data.employeeId,
      preferredRoleTitle: data.preferredRoleTitle ?? null,
      preferredDepartmentRef: data.preferredDepartmentRef ?? null,
      preferredLocationRef: data.preferredLocationRef ?? null,
      mobilityPreference: data.mobilityPreference ?? null,
      notes: data.notes ?? null,
      updatedByUserId: session.userId,
    })
    .onConflictDoUpdate({
      target: [
        hrmEmployeeCareerAspiration.organizationId,
        hrmEmployeeCareerAspiration.employeeId,
      ],
      set: {
        preferredRoleTitle: data.preferredRoleTitle ?? null,
        preferredDepartmentRef: data.preferredDepartmentRef ?? null,
        preferredLocationRef: data.preferredLocationRef ?? null,
        mobilityPreference: data.mobilityPreference ?? null,
        notes: data.notes ?? null,
        updatedByUserId: session.userId,
        updatedAt: new Date(),
      },
    })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.aspiration.update,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_employee_career_aspiration",
      resourceId: data.employeeId,
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createTargetRoleAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createTargetRoleFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    frameworkId: formData.get("frameworkId") || undefined,
    targetRoleTitle: formData.get("targetRoleTitle"),
    jobFamilyRef: formData.get("jobFamilyRef") || undefined,
    gradeRef: formData.get("gradeRef") || undefined,
    positionRef: formData.get("positionRef") || undefined,
    departmentRef: formData.get("departmentRef") || undefined,
    source: formData.get("source") || "employee",
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid target role payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const data = parsed.data

  await db
    .update(hrmEmployeeTargetRole)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(
      and(
        eq(hrmEmployeeTargetRole.organizationId, organizationId),
        eq(hrmEmployeeTargetRole.employeeId, data.employeeId)
      )
    )

  const [row] = await db
    .insert(hrmEmployeeTargetRole)
    .values({
      organizationId,
      employeeId: data.employeeId,
      frameworkId: data.frameworkId ?? null,
      targetRoleTitle: data.targetRoleTitle,
      jobFamilyRef: data.jobFamilyRef ?? null,
      gradeRef: data.gradeRef ?? null,
      positionRef: data.positionRef ?? null,
      departmentRef: data.departmentRef ?? null,
      source: data.source,
      isPrimary: true,
      recommendedByUserId:
        data.source === "manager" || data.source === "hr"
          ? session.userId
          : null,
    })
    .returning({ id: hrmEmployeeTargetRole.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.targetRole.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_employee_target_role",
      resourceId: row?.id ?? "",
    })
  )

  await recomputeReadinessForEmployee(organizationId, data.employeeId)
  revalidateCareerPathing()
  return { ok: true }
}

export async function createDevelopmentPlanAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createDevelopmentPlanFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    targetRoleId: formData.get("targetRoleId") || undefined,
    title: formData.get("title"),
    startDate: formData.get("startDate") || undefined,
    targetDate: formData.get("targetDate") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid development plan payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const data = parsed.data

  const [row] = await db
    .insert(hrmDevelopmentPlan)
    .values({
      organizationId,
      employeeId: data.employeeId,
      targetRoleId: data.targetRoleId ?? null,
      title: data.title,
      status: "active",
      startDate: data.startDate ?? null,
      targetDate: data.targetDate ?? null,
      createdByUserId: session.userId,
      updatedByUserId: session.userId,
    })
    .returning({ id: hrmDevelopmentPlan.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.plan.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_plan",
      resourceId: row?.id ?? "",
    })
  )

  await recomputeReadinessForEmployee(organizationId, data.employeeId)
  revalidateCareerPathing()
  return { ok: true }
}

export async function createDevelopmentGoalAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createDevelopmentGoalFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    title: formData.get("title"),
    goalType: formData.get("goalType"),
    targetDate: formData.get("targetDate") || undefined,
    priority: formData.get("priority") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid goal payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentGoal)
    .values({
      organizationId,
      planId: parsed.data.planId,
      title: parsed.data.title,
      goalType: parsed.data.goalType,
      status: "not_started",
      targetDate: parsed.data.targetDate ?? null,
      priority: parsed.data.priority ?? null,
      ownerUserId: session.userId,
    })
    .returning({ id: hrmDevelopmentGoal.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.goal.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_goal",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function updateDevelopmentGoalStatusAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateDevelopmentGoalStatusFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid goal status payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  await db
    .update(hrmDevelopmentGoal)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(
        eq(hrmDevelopmentGoal.id, parsed.data.goalId),
        eq(hrmDevelopmentGoal.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.goal.update,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_goal",
      resourceId: parsed.data.goalId,
    })
  )

  after(() =>
    notifyCareerPathGoalStatusChange({
      organizationId,
      goalId: parsed.data.goalId,
      status: parsed.data.status,
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createDevelopmentMilestoneAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createDevelopmentMilestoneFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    title: formData.get("title"),
    targetDate: formData.get("targetDate") || undefined,
    completionCriteria: formData.get("completionCriteria") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid milestone payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentMilestone)
    .values({
      organizationId,
      goalId: parsed.data.goalId,
      title: parsed.data.title,
      targetDate: parsed.data.targetDate ?? null,
      status: "not_started",
      ownerUserId: session.userId,
      completionCriteria: parsed.data.completionCriteria ?? null,
    })
    .returning({ id: hrmDevelopmentMilestone.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.milestone.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_milestone",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function updateMilestoneStatusAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateMilestoneStatusFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    milestoneId: formData.get("milestoneId"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid milestone status payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  await db
    .update(hrmDevelopmentMilestone)
    .set({
      status: parsed.data.status,
      completedAt: parsed.data.status === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmDevelopmentMilestone.id, parsed.data.milestoneId),
        eq(hrmDevelopmentMilestone.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.milestone.update,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_milestone",
      resourceId: parsed.data.milestoneId,
    })
  )

  after(() =>
    notifyCareerPathMilestoneStatusChange({
      organizationId,
      milestoneId: parsed.data.milestoneId,
      status: parsed.data.status,
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createLearningActionAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createLearningActionFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    title: formData.get("title"),
    trainingCourseId: formData.get("trainingCourseId") || undefined,
    externalRef: formData.get("externalRef") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid learning action payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentLearningAction)
    .values({
      organizationId,
      goalId: parsed.data.goalId,
      title: parsed.data.title,
      trainingCourseId: parsed.data.trainingCourseId ?? null,
      externalRef: parsed.data.externalRef ?? null,
      status: "recommended",
    })
    .returning({ id: hrmDevelopmentLearningAction.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.learningAction.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_learning_action",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createStretchAssignmentAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createStretchAssignmentFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    title: formData.get("title"),
    assignmentKind: formData.get("assignmentKind"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    notes: formData.get("notes") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid stretch assignment payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentStretchAssignment)
    .values({
      organizationId,
      planId: parsed.data.planId,
      title: parsed.data.title,
      assignmentKind: parsed.data.assignmentKind,
      status: "planned",
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: hrmDevelopmentStretchAssignment.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.stretch.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_stretch_assignment",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function assignMentorAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = assignMentorFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    mentorEmployeeId: formData.get("mentorEmployeeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid mentor assignment payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentMentorAssignment)
    .values({
      organizationId,
      planId: parsed.data.planId,
      mentorEmployeeId: parsed.data.mentorEmployeeId,
      status: "active",
    })
    .returning({ id: hrmDevelopmentMentorAssignment.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.mentor.assign,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_mentor_assignment",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function assignCoachAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = assignCoachFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    coachEmployeeId: formData.get("coachEmployeeId"),
    objective: formData.get("objective") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid coach assignment payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentCoachAssignment)
    .values({
      organizationId,
      planId: parsed.data.planId,
      coachEmployeeId: parsed.data.coachEmployeeId,
      objective: parsed.data.objective ?? null,
      status: "active",
    })
    .returning({ id: hrmDevelopmentCoachAssignment.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.coach.assign,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_coach_assignment",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createDevelopmentSessionAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createDevelopmentSessionFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    sessionKind: formData.get("sessionKind"),
    sessionDate: formData.get("sessionDate"),
    notes: formData.get("notes") || undefined,
    actions: formData.get("actions") || undefined,
    outcome: formData.get("outcome") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid session payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmDevelopmentSession)
    .values({
      organizationId,
      planId: parsed.data.planId,
      sessionKind: parsed.data.sessionKind,
      sessionDate: parsed.data.sessionDate,
      notes: parsed.data.notes ?? null,
      actions: parsed.data.actions ?? null,
      outcome: parsed.data.outcome ?? null,
      createdByUserId: session.userId,
    })
    .returning({ id: hrmDevelopmentSession.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.session.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_session",
      resourceId: row?.id ?? "",
    })
  )

  revalidateCareerPathing()
  return { ok: true }
}

export async function createCareerDiscussionAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createCareerDiscussionFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    planId: formData.get("planId") || undefined,
    discussionDate: formData.get("discussionDate"),
    participants: formData.get("participants") || undefined,
    notes: formData.get("notes") || undefined,
    agreedActions: formData.get("agreedActions") || undefined,
    nextReviewDate: formData.get("nextReviewDate") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid discussion payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [row] = await db
    .insert(hrmCareerDiscussion)
    .values({
      organizationId,
      employeeId: parsed.data.employeeId,
      planId: parsed.data.planId ?? null,
      discussionDate: parsed.data.discussionDate,
      participants: parsed.data.participants ?? null,
      notes: parsed.data.notes ?? null,
      agreedActions: parsed.data.agreedActions ?? null,
      nextReviewDate: parsed.data.nextReviewDate ?? null,
      createdByUserId: session.userId,
    })
    .returning({ id: hrmCareerDiscussion.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.discussion.create,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_career_discussion",
      resourceId: row?.id ?? "",
    })
  )

  if (row?.id) {
    after(() =>
      notifyCareerPathDiscussionCreated({
        organizationId,
        discussionId: row.id,
        employeeId: parsed.data.employeeId,
      })
    )
  }

  revalidateCareerPathing()
  return { ok: true }
}

export async function updateManagerReviewAction(
  formData: FormData
): Promise<CareerPathingMutationFormState> {
  const gate = await requireCareerPathPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateManagerReviewFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    planId: formData.get("planId"),
    managerReviewNote: formData.get("managerReviewNote"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid manager review payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId

  const [plan] = await db
    .update(hrmDevelopmentPlan)
    .set({
      managerReviewNote: parsed.data.managerReviewNote,
      updatedByUserId: session.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmDevelopmentPlan.id, parsed.data.planId),
        eq(hrmDevelopmentPlan.organizationId, organizationId)
      )
    )
    .returning({ employeeId: hrmDevelopmentPlan.employeeId })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_CAREER_PATH_AUDIT.plan.update,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_development_plan",
      resourceId: parsed.data.planId,
    })
  )

  if (plan?.employeeId) {
    await recomputeReadinessForEmployee(organizationId, plan.employeeId)
  }
  revalidateCareerPathing()
  return { ok: true }
}

/** HRM-CAR-029 — readiness CSV for HR reporting. */
export async function exportCareerPathReadinessCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const permission = await requireErpPermission({
    ...CAREER_PATH_PERMISSION,
    function: "search",
  })
  if (!permission.ok) {
    return { ok: false, error: permission.error }
  }

  const { csv, filename } = await buildCareerPathReadinessExportCsv(
    session.organizationId
  )
  return { ok: true, csv, filename }
}
