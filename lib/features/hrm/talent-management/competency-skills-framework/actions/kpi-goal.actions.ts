"use server"

import type { ZodError } from "zod"
import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_KPI } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/tenant"

import {
  deleteKpiGoal,
  deleteKpiGoalComment,
  deleteKpiGoalMilestone,
  insertKpiGoal,
  insertKpiGoalComment,
  insertKpiGoalMilestone,
  updateKpiGoal,
  updateKpiGoalMilestone,
} from "../data/kpi-goal.mutations.server"
import {
  getKpiGoalById,
  getKpiGoalCommentById,
  getKpiGoalMilestoneById,
} from "../data/kpi-goal.queries.server"
import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import {
  addKpiGoalMilestoneFormSchema,
  closeKpiGoalFormSchema,
  createKpiGoalFormSchema,
  deleteKpiGoalCommentFormSchema,
  deleteKpiGoalFormSchema,
  postKpiGoalCommentFormSchema,
  removeKpiGoalMilestoneFormSchema,
  updateKpiGoalFormSchema,
  updateKpiGoalMilestoneFormSchema,
} from "../schemas/kpi-goal.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

function zodErrors(err: ZodError): Record<string, string | undefined> {
  const flat = err.flatten()
  const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>
  const fields = Object.fromEntries(
    Object.entries(fieldErrors).map(([k, v]) => [
      k,
      Array.isArray(v) && v.length > 0 ? v[0] : undefined,
    ])
  ) as Record<string, string | undefined>
  const formErrors = flat.formErrors as string[]
  return Object.keys(fields).length > 0
    ? fields
    : { form: formErrors[0] ?? "Invalid input." }
}

const KPI_PERMISSION = {
  module: "hrm",
  object: "kpi",
} as const

function revalidateKpi() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_KPI),
    "page"
  )
}

async function requireKpiGoalPermission(
  formData: FormData,
  fn: "create" | "update" | "delete"
): Promise<
  | { ok: true; session: OrgSession; orgSlug: string }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...KPI_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return { ok: true, session: permission.session, orgSlug: tenant.orgSlug }
}

export async function submitCreateKpiGoalAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createKpiGoalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    ownerEmployeeId: formData.get("ownerEmployeeId"),
    title: formData.get("title"),
    description: formData.get("description") || null,
    dueDate: formData.get("dueDate"),
    alignsWithGoalId: formData.get("alignsWithGoalId") || null,
  })
  if (!parsed.success) {
    return hrmActionFailure(zodErrors(parsed.error))
  }

  const { session } = gate
  const aligns = parsed.data.alignsWithGoalId ?? null
  if (aligns) {
    const parent = await getKpiGoalById({
      organizationId: session.organizationId,
      goalId: aligns,
    })
    if (!parent) {
      return hrmActionFailure({ form: "Parent goal not found." })
    }
  }

  const goalId = await insertKpiGoal({
    organizationId: session.organizationId,
    ownerEmployeeId: parsed.data.ownerEmployeeId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    dueDateIso: parsed.data.dueDate,
    alignsWithGoalId: aligns,
    sharedWithEmployeeIds: parsed.data.sharedWithEmployeeIds ?? [],
    createdByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal.create",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal",
      resourceId: goalId,
      metadata: {
        ownerEmployeeId: parsed.data.ownerEmployeeId,
      },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitUpdateKpiGoalAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateKpiGoalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    title: formData.get("title") || undefined,
    description: formData.get("description"),
    dueDate: formData.get("dueDate") || undefined,
    percentComplete: formData.get("percentComplete") || undefined,
    alignsWithGoalId: formData.get("alignsWithGoalId"),
  })
  if (!parsed.success) {
    return hrmActionFailure(zodErrors(parsed.error))
  }

  const { session } = gate
  const existing = await getKpiGoalById({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
  })
  if (!existing) {
    return hrmActionFailure({ form: "Goal not found." })
  }

  const aligns = parsed.data.alignsWithGoalId
  if (aligns !== undefined && aligns !== null) {
    if (aligns === parsed.data.goalId) {
      return hrmActionFailure({ form: "Goal cannot align to itself." })
    }
    const parent = await getKpiGoalById({
      organizationId: session.organizationId,
      goalId: aligns,
    })
    if (!parent) {
      return hrmActionFailure({ form: "Parent goal not found." })
    }
  }

  await updateKpiGoal({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
    title: parsed.data.title,
    description: parsed.data.description,
    dueDateIso: parsed.data.dueDate,
    percentComplete: parsed.data.percentComplete,
    alignsWithGoalId: aligns,
    updatedByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal.update",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal",
      resourceId: parsed.data.goalId,
      metadata: {},
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitCloseKpiGoalAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = closeKpiGoalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid close request." })
  }

  const { session } = gate
  const existing = await getKpiGoalById({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
  })
  if (!existing) {
    return hrmActionFailure({ form: "Goal not found." })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  await updateKpiGoal({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
    status: "closed",
    completionDate: today,
    updatedByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal.close",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal",
      resourceId: parsed.data.goalId,
      metadata: {},
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitDeleteKpiGoalAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "delete")
  if (!gate.ok) return gate.response

  const parsed = deleteKpiGoalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid delete request." })
  }

  const { session } = gate
  await deleteKpiGoal({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal.delete",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal",
      resourceId: parsed.data.goalId,
      metadata: {},
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitAddKpiGoalMilestoneAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = addKpiGoalMilestoneFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    title: formData.get("title"),
    sortOrder: formData.get("sortOrder") || undefined,
    startValue: formData.get("startValue") || null,
    endValue: formData.get("endValue") || null,
    currentValue: formData.get("currentValue") || null,
  })
  if (!parsed.success) {
    return hrmActionFailure(zodErrors(parsed.error))
  }

  const { session } = gate
  const goal = await getKpiGoalById({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
  })
  if (!goal) return hrmActionFailure({ form: "Goal not found." })

  const milestoneId = await insertKpiGoalMilestone({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
    title: parsed.data.title.trim(),
    sortOrder: parsed.data.sortOrder ?? 0,
    startValue: parsed.data.startValue?.trim() || null,
    endValue: parsed.data.endValue?.trim() || null,
    currentValue: parsed.data.currentValue?.trim() || null,
    updatedByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal_milestone.create",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal_milestone",
      resourceId: milestoneId,
      metadata: { goalId: parsed.data.goalId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitUpdateKpiGoalMilestoneAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateKpiGoalMilestoneFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    milestoneId: formData.get("milestoneId"),
    title: formData.get("title") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
    startValue: formData.get("startValue"),
    endValue: formData.get("endValue"),
    currentValue: formData.get("currentValue"),
    completedAt: formData.get("completedAt"),
  })
  if (!parsed.success) {
    return hrmActionFailure(zodErrors(parsed.error))
  }

  const { session } = gate
  const ms = await getKpiGoalMilestoneById({
    organizationId: session.organizationId,
    milestoneId: parsed.data.milestoneId,
  })
  if (!ms) return hrmActionFailure({ form: "Milestone not found." })

  let completedAt: Date | null | undefined
  if (parsed.data.completedAt !== undefined) {
    completedAt =
      parsed.data.completedAt && parsed.data.completedAt.length > 0
        ? new Date(`${parsed.data.completedAt}T00:00:00.000Z`)
        : null
  }

  await updateKpiGoalMilestone({
    organizationId: session.organizationId,
    milestoneId: parsed.data.milestoneId,
    title: parsed.data.title,
    sortOrder: parsed.data.sortOrder,
    startValue: parsed.data.startValue,
    endValue: parsed.data.endValue,
    currentValue: parsed.data.currentValue,
    completedAt,
    updatedByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal_milestone.update",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal_milestone",
      resourceId: parsed.data.milestoneId,
      metadata: { goalId: ms.goalId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitRemoveKpiGoalMilestoneAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = removeKpiGoalMilestoneFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    milestoneId: formData.get("milestoneId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid milestone delete." })
  }

  const { session } = gate
  const ms = await getKpiGoalMilestoneById({
    organizationId: session.organizationId,
    milestoneId: parsed.data.milestoneId,
  })
  if (!ms) return hrmActionFailure({ form: "Milestone not found." })

  await deleteKpiGoalMilestone({
    organizationId: session.organizationId,
    milestoneId: parsed.data.milestoneId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal_milestone.delete",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal_milestone",
      resourceId: parsed.data.milestoneId,
      metadata: { goalId: ms.goalId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitPostKpiGoalCommentAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = postKpiGoalCommentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    goalId: formData.get("goalId"),
    text: formData.get("text"),
  })
  if (!parsed.success) {
    return hrmActionFailure(zodErrors(parsed.error))
  }

  const { session } = gate
  const goal = await getKpiGoalById({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
  })
  if (!goal) return hrmActionFailure({ form: "Goal not found." })

  const commentId = await insertKpiGoalComment({
    organizationId: session.organizationId,
    goalId: parsed.data.goalId,
    authorUserId: session.userId,
    commentText: parsed.data.text.trim(),
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal_comment.create",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal_comment",
      resourceId: commentId,
      metadata: { goalId: parsed.data.goalId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function submitDeleteKpiGoalCommentAction(
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiGoalPermission(formData, "delete")
  if (!gate.ok) return gate.response

  const parsed = deleteKpiGoalCommentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    commentId: formData.get("commentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid comment delete." })
  }

  const { session } = gate
  const row = await getKpiGoalCommentById({
    organizationId: session.organizationId,
    commentId: parsed.data.commentId,
  })
  if (!row) return hrmActionFailure({ form: "Comment not found." })
  if (row.authorUserId !== session.userId) {
    return hrmActionFailure({ form: "You can only delete your own comments." })
  }

  await deleteKpiGoalComment({
    organizationId: session.organizationId,
    commentId: parsed.data.commentId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi_goal_comment.delete",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_kpi_goal_comment",
      resourceId: parsed.data.commentId,
      metadata: { goalId: row.goalId },
    })
  )

  revalidateKpi()
  return { ok: true }
}
