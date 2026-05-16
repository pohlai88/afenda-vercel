"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_TRAINING } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/tenant"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { appendTrainingEvent } from "../data/training-event-log.server"
import {
  loadTrainingCourseName,
  loadTrainingSessionSummary,
  notifyTrainingAssigned,
  notifyTrainingSessionScheduled,
  resolveEmployeePortalNotificationContext,
} from "../data/training-notification.server"
import {
  assignTrainingInTransaction,
  transitionTrainingAssignmentState,
} from "../data/training-assignment.mutations.server"
import { assignTrainingFormSchema } from "../schemas/training.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import { HRM_TRAINING_AUDIT } from "../training.contract"
import type { TrainingMutationFormState } from "../data/training.types.shared"

const TRAINING_PERMISSION = {
  module: "hrm",
  object: "training",
} as const

function revalidateTraining() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_TRAINING),
    "page"
  )
}

async function requireTrainingPermission(
  formData: FormData,
  fn: "create" | "update"
): Promise<
  | { ok: true; session: OrgSession; orgSlug: string }
  | { ok: false; response: TrainingMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...TRAINING_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return { ok: true, session: permission.session, orgSlug: tenant.orgSlug }
}

function parseOptionalDueAt(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function assignTrainingAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = assignTrainingFormSchema.safeParse({
    organizationId: formData.get("organizationId"),
    orgSlug: formData.get("orgSlug"),
    courseId: formData.get("courseId"),
    sessionId: formData.get("sessionId") || undefined,
    employeeId: formData.get("employeeId"),
    dueAt: formData.get("dueAt") || undefined,
    required: formData.get("required")?.toString(),
    priority: formData.get("priority") || "normal",
    sourceKind: formData.get("sourceKind") || "manual",
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid assignment payload." })
  }

  const { session } = gate
  const organizationId = session.organizationId
  const userId = session.userId

  const assignResult = await assignTrainingInTransaction({
    organizationId,
    courseId: parsed.data.courseId,
    sessionId: parsed.data.sessionId,
    employeeId: parsed.data.employeeId,
    dueAt: parseOptionalDueAt(parsed.data.dueAt),
    required: parsed.data.required,
    priority: parsed.data.priority,
    sourceKind: parsed.data.sourceKind,
    actorUserId: userId,
  })

  if (!assignResult.ok) {
    return hrmActionFailure({ form: assignResult.message })
  }

  const assignmentId = assignResult.assignmentId

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.assignment.create,
      actorUserId: userId,
      actorSessionId: session.sessionId,
      organizationId,
      resourceType: "hrm_training_assignment",
      resourceId: assignmentId,
      metadata: {
        courseId: parsed.data.courseId,
        employeeId: parsed.data.employeeId,
        sourceKind: parsed.data.sourceKind,
      },
    })
    await appendTrainingEvent({
      organizationId,
      action: "assigned",
      employeeId: parsed.data.employeeId,
      actorUserId: userId,
      assignmentId,
      sessionId: parsed.data.sessionId ?? null,
      payload: { courseId: parsed.data.courseId },
    })

    const portalCtx =
      await resolveEmployeePortalNotificationContext(organizationId)
    if (portalCtx) {
      const { locale, portalSlug } = portalCtx
      const courseName = await loadTrainingCourseName(
        organizationId,
        parsed.data.courseId
      )

      if (parsed.data.sessionId) {
        // Session-assigned: send a single session notification that includes
        // assignment context — avoids double emails when both apply.
        const sessionSummary = await loadTrainingSessionSummary(
          organizationId,
          parsed.data.sessionId
        )
        if (sessionSummary) {
          notifyTrainingSessionScheduled({
            locale,
            portalSlug,
            organizationId,
            employeeId: parsed.data.employeeId,
            sessionTitle: sessionSummary.title,
            scheduledStartAt: sessionSummary.scheduledStartAt,
            location: sessionSummary.location,
          })
        } else {
          notifyTrainingAssigned({
            locale,
            portalSlug,
            organizationId,
            employeeId: parsed.data.employeeId,
            courseName,
            dueAt: parseOptionalDueAt(parsed.data.dueAt),
          })
        }
      } else {
        notifyTrainingAssigned({
          locale,
          portalSlug,
          organizationId,
          employeeId: parsed.data.employeeId,
          courseName,
          dueAt: parseOptionalDueAt(parsed.data.dueAt),
        })
      }
    }
  })

  revalidateTraining()
  return { ok: true, id: assignmentId }
}

export async function waiveTrainingAssignmentAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "update")
  if (!gate.ok) return gate.response

  const assignmentId = String(formData.get("assignmentId") ?? "")
  if (!assignmentId) {
    return hrmActionFailure({ assignmentId: "Required" })
  }

  const result = await transitionTrainingAssignmentState({
    organizationId: gate.session.organizationId,
    assignmentId,
    toState: "waived",
    actorUserId: gate.session.userId,
  })
  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.assignment.update,
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId: gate.session.organizationId,
      resourceType: "hrm_training_assignment",
      resourceId: assignmentId,
      metadata: { state: "waived" },
    })
  )

  revalidateTraining()
  return { ok: true, id: assignmentId }
}

export async function cancelTrainingAssignmentAction(
  formData: FormData
): Promise<TrainingMutationFormState> {
  const gate = await requireTrainingPermission(formData, "update")
  if (!gate.ok) return gate.response

  const assignmentId = String(formData.get("assignmentId") ?? "")
  if (!assignmentId) {
    return hrmActionFailure({ assignmentId: "Required" })
  }

  const result = await transitionTrainingAssignmentState({
    organizationId: gate.session.organizationId,
    assignmentId,
    toState: "cancelled",
    actorUserId: gate.session.userId,
  })
  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_TRAINING_AUDIT.assignment.deprecate,
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId: gate.session.organizationId,
      resourceType: "hrm_training_assignment",
      resourceId: assignmentId,
      metadata: { state: "cancelled" },
    })
  )

  revalidateTraining()
  return { ok: true, id: assignmentId }
}

export async function submitAssignTraining(formData: FormData) {
  await assignTrainingAction(formData)
}

export async function submitWaiveTrainingAssignment(formData: FormData) {
  await waiveTrainingAssignmentAction(formData)
}

export async function submitCancelTrainingAssignment(formData: FormData) {
  await cancelTrainingAssignmentAction(formData)
}
