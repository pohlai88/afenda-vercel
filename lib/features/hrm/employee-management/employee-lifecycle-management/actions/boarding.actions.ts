"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_APPS_HRM_EMPLOYEE_DETAIL,
  ORG_APPS_HRM_EMPLOYEES,
  ORG_APPS_HRM_ONBOARDING,
} from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireBoardingTaskMutationGate } from "../data/employee-lifecycle-action-guard.server"
import { transitionBoardingTask } from "../data/boarding.mutations.server"
import {
  boardingTaskActionFormSchema,
  waiveBoardingTaskFormSchema,
} from "../schemas/boarding.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_EMPLOYEE_LIFECYCLE_AUDIT } from "../employee-lifecycle.contract"
import type { ContractMutationFormState } from "../../../types"

const ORG_APPS_HRM_OFFBOARDING = "/hrm/offboarding" as const

function revalidateBoardingSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_ONBOARDING),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_OFFBOARDING),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

export async function startBoardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const taskId = String(formData.get("taskId") ?? "")
  const gate = await requireBoardingTaskMutationGate(formData, taskId)
  if (!gate.ok) return gate.response

  const parsed = boardingTaskActionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    taskId: formData.get("taskId"),
    note: formData.get("note"),
    evidenceDocumentId: formData.get("evidenceDocumentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await transitionBoardingTask({
    organizationId: gate.organizationId,
    taskId: parsed.data.taskId,
    actorUserId: gate.userId,
    action: "start",
    note: parsed.data.note ?? undefined,
    evidenceDocumentId: parsed.data.evidenceDocumentId ?? undefined,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.boarding.task_start,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_boarding_task",
      resourceId: result.taskId,
      metadata: {
        instanceId: result.instanceId,
        kind: result.kind,
        taskKey: result.taskKey,
      },
    })
  )

  revalidateBoardingSurfaces()
  return { ok: true }
}

export async function completeBoardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const taskId = String(formData.get("taskId") ?? "")
  const gate = await requireBoardingTaskMutationGate(formData, taskId)
  if (!gate.ok) return gate.response

  const parsed = boardingTaskActionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    taskId: formData.get("taskId"),
    note: formData.get("note"),
    evidenceDocumentId: formData.get("evidenceDocumentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await transitionBoardingTask({
    organizationId: gate.organizationId,
    taskId: parsed.data.taskId,
    actorUserId: gate.userId,
    action: "complete",
    note: parsed.data.note ?? undefined,
    evidenceDocumentId: parsed.data.evidenceDocumentId ?? undefined,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.boarding.task_complete,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_boarding_task",
      resourceId: result.taskId,
      metadata: {
        instanceId: result.instanceId,
        kind: result.kind,
        taskKey: result.taskKey,
      },
    })
  )

  if (result.instanceStatus === "completed" && result.kind === "onboarding") {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.onboarding.complete,
        actorUserId: gate.userId,
        actorSessionId: gate.sessionId,
        organizationId: gate.organizationId,
        resourceType: "hrm_boarding_instance",
        resourceId: result.instanceId,
        metadata: {
          employeeId: result.employeeId,
          contractId: result.contractId ?? null,
        },
      })
    )
  }

  revalidateBoardingSurfaces()
  return { ok: true }
}

export async function waiveBoardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const taskId = String(formData.get("taskId") ?? "")
  const gate = await requireBoardingTaskMutationGate(formData, taskId)
  if (!gate.ok) return gate.response

  const parsed = waiveBoardingTaskFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    taskId: formData.get("taskId"),
    note: formData.get("note"),
    evidenceDocumentId: formData.get("evidenceDocumentId"),
    waiverReason: formData.get("waiverReason"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.waiverReason?.[0] ?? parsed.error.issues[0]?.message,
    })
  }

  const result = await transitionBoardingTask({
    organizationId: gate.organizationId,
    taskId: parsed.data.taskId,
    actorUserId: gate.userId,
    action: "waive",
    note: parsed.data.note ?? undefined,
    waiverReason: parsed.data.waiverReason,
    evidenceDocumentId: parsed.data.evidenceDocumentId ?? undefined,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.boarding.task_waive,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_boarding_task",
      resourceId: result.taskId,
      metadata: {
        instanceId: result.instanceId,
        kind: result.kind,
        taskKey: result.taskKey,
      },
    })
  )

  revalidateBoardingSurfaces()
  return { ok: true }
}
