"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { organizationHrmEmployeePath } from "../../../constants"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import {
  closeOffboardingCaseMutation,
  initiateOffboardingMutation,
  recordExitInterviewFeedbackMutation,
  reviewOffboardingApprovalMutation,
  scheduleExitInterviewMutation,
  setRehireEligibilityMutation,
  transitionOffboardingTaskMutation,
  updateSettlementReadinessMutation,
  upsertOffboardingClearanceItemMutation,
} from "../data/offboarding.mutations.server"
import { requireOffboardingMutationGate } from "../data/offboarding-action-guard.server"
import { HRM_OFFBOARDING_EXIT_AUDIT } from "../offboarding-exit.contract"
import {
  closeOffboardingCaseFormSchema,
  transitionOffboardingTaskFormSchema,
  upsertOffboardingClearanceItemFormSchema,
} from "../schemas/offboarding.schema"
import {
  initiateOffboardingFormSchema,
  recordExitInterviewFeedbackFormSchema,
  reviewOffboardingApprovalFormSchema,
  scheduleExitInterviewFormSchema,
  setRehireEligibilityFormSchema,
  updateSettlementReadinessFormSchema,
} from "../schemas/offboarding-initiation.schema"

function normalizeDateTimeInput(
  value: FormDataEntryValue | null
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00.000Z`
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}.000Z`
  }
  return trimmed
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function checkboxBoolean(
  value: FormDataEntryValue | null
): boolean | undefined {
  if (value === null) return undefined
  return value === "true" || value === "on"
}

function parseSettlementBlockers(
  formData: FormData
): readonly { code: string; message: string }[] {
  const rawJson = formData.get("blockers")
  if (typeof rawJson === "string" && rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            item && typeof item === "object"
              ? {
                  code: String(
                    (item as Record<string, unknown>).code ?? ""
                  ).trim(),
                  message: String(
                    (item as Record<string, unknown>).message ?? ""
                  ).trim(),
                }
              : null
          )
          .filter((item): item is { code: string; message: string } =>
            Boolean(item?.code && item.message)
          )
      }
    } catch {
      return []
    }
  }

  const codes = formData.getAll("blockerCode")
  const messages = formData.getAll("blockerMessage")
  return codes
    .map((code, index) => ({
      code: typeof code === "string" ? code.trim() : "",
      message:
        typeof messages[index] === "string"
          ? String(messages[index]).trim()
          : "",
    }))
    .filter((item) => item.code && item.message)
}

function revalidateOffboardingViews(orgSlug: string, employeeId: string): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
  revalidatePath(organizationHrmEmployeePath(orgSlug, employeeId), "page")
}

function auditOffboarding(input: {
  readonly action: string
  readonly actorUserId: string
  readonly actorSessionId: string
  readonly organizationId: string
  readonly resourceId: string
  readonly metadata?: Record<string, unknown>
}) {
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: input.action,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
    })
  )
}

export async function initiateOffboardingAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = initiateOffboardingFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    exitType: formData.get("exitType"),
    exitReason: formData.get("exitReason"),
    terminationDate: formData.get("terminationDate"),
    lastWorkingDate: formData.get("lastWorkingDate"),
    effectiveSeparationDate:
      formData.get("effectiveSeparationDate") || undefined,
    noticeStartDate: formData.get("noticeStartDate") || undefined,
    noticeEndDate: formData.get("noticeEndDate") || undefined,
    requiredNoticeDays: optionalNumber(formData.get("requiredNoticeDays")),
    noticeWaived: checkboxBoolean(formData.get("noticeWaived")),
    shortNotice: checkboxBoolean(formData.get("shortNotice")),
    skipApproval: checkboxBoolean(formData.get("skipApproval")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const result = await initiateOffboardingMutation({
    ...parsed.data,
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    contractId: optionalString(formData.get("contractId")) ?? null,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.initiated,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      status: result.status,
      exitType: parsed.data.exitType,
      boardingInstanceId: result.boardingInstanceId,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function initiateOffboardingFormAction(
  formData: FormData
): Promise<void> {
  void (await initiateOffboardingAction(undefined, formData))
}

export async function reviewOffboardingApprovalAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = reviewOffboardingApprovalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    decision: formData.get("decision"),
    reviewNote: optionalString(formData.get("reviewNote")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid approval fields." })
  }

  const result = await reviewOffboardingApprovalMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action:
      parsed.data.decision === "approved"
        ? HRM_OFFBOARDING_EXIT_AUDIT.approved
        : HRM_OFFBOARDING_EXIT_AUDIT.rejected,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      reviewNote: parsed.data.reviewNote ?? null,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function reviewOffboardingApprovalFormAction(
  formData: FormData
): Promise<void> {
  void (await reviewOffboardingApprovalAction(undefined, formData))
}

export async function scheduleExitInterviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = scheduleExitInterviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    scheduledAt: normalizeDateTimeInput(formData.get("scheduledAt")),
    interviewerNote: optionalString(formData.get("interviewerNote")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid interview fields." })
  }

  const result = await scheduleExitInterviewMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.exit_interview_scheduled,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      scheduledAt: parsed.data.scheduledAt,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function recordExitInterviewFeedbackAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = recordExitInterviewFeedbackFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    completedAt: normalizeDateTimeInput(formData.get("completedAt")),
    feedbackSummary: formData.get("feedbackSummary"),
    wouldRehire:
      formData.get("wouldRehire") === null
        ? undefined
        : formData.get("wouldRehire") === "true",
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid feedback fields." })
  }

  const result = await recordExitInterviewFeedbackMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.exit_interview_completed,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      completedAt: parsed.data.completedAt,
      wouldRehire: parsed.data.wouldRehire ?? null,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function updateSettlementReadinessAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = updateSettlementReadinessFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    settlementReadinessStatus: formData.get("settlementReadinessStatus"),
    finalSettlementReference: optionalString(
      formData.get("finalSettlementReference")
    ),
    blockers: parseSettlementBlockers(formData),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid settlement fields." })
  }

  const result = await updateSettlementReadinessMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
    settlementBlockers: parsed.data.blockers,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  const settlementAuditAction =
    parsed.data.settlementReadinessStatus === "blocked"
      ? HRM_OFFBOARDING_EXIT_AUDIT.settlement_blocked
      : HRM_OFFBOARDING_EXIT_AUDIT.settlement_ready

  auditOffboarding({
    action: settlementAuditAction,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      settlementReadinessStatus: parsed.data.settlementReadinessStatus,
      blockers: parsed.data.blockers,
      finalSettlementReference: parsed.data.finalSettlementReference ?? null,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function setRehireEligibilityAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = setRehireEligibilityFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    rehireEligibility: formData.get("rehireEligibility"),
    note: optionalString(formData.get("note")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid rehire fields." })
  }

  const result = await setRehireEligibilityMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.rehire_eligibility_set,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      rehireEligibility: parsed.data.rehireEligibility,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function completeOffboardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = transitionOffboardingTaskFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    taskKey: formData.get("taskKey"),
    employeeId: formData.get("employeeId"),
    transition: formData.get("transition") ?? "complete",
    note: optionalString(formData.get("note")),
    evidenceDocumentId: optionalString(formData.get("evidenceDocumentId")),
    waiverReason: optionalString(formData.get("waiverReason")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const result = await transitionOffboardingTaskMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.task.complete,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      taskKey: parsed.data.taskKey,
      taskStatus: result.taskStatus,
      checklistStatus: result.status,
    },
  })

  if (result.status === "completed") {
    auditOffboarding({
      action: HRM_OFFBOARDING_EXIT_AUDIT.complete,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceId: result.instanceId,
      metadata: { employeeId: parsed.data.employeeId },
    })
  }

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function completeOffboardingTaskFormAction(
  formData: FormData
): Promise<void> {
  void (await completeOffboardingTaskAction(undefined, formData))
}

export async function closeOffboardingCaseAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = closeOffboardingCaseFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    closureNote: optionalString(formData.get("closureNote")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const result = await closeOffboardingCaseMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.complete,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: result.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      closureNote: parsed.data.closureNote ?? null,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}

export async function upsertOffboardingClearanceItemAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireOffboardingMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = upsertOffboardingClearanceItemFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    employeeId: formData.get("employeeId"),
    category: formData.get("category"),
    itemKey: formData.get("itemKey"),
    title: formData.get("title"),
    ownerRole: formData.get("ownerRole"),
    status: formData.get("status"),
    dueAt: optionalString(formData.get("dueAt")),
    evidenceDocumentId: optionalString(formData.get("evidenceDocumentId")),
    evidenceNote: optionalString(formData.get("evidenceNote")),
    blockedReason: optionalString(formData.get("blockedReason")),
    referenceType: optionalString(formData.get("referenceType")),
    referenceId: optionalString(formData.get("referenceId")),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: "Missing or invalid clearance item fields.",
    })
  }

  const result = await upsertOffboardingClearanceItemMutation({
    organizationId: gate.organizationId,
    actorUserId: gate.userId,
    ...parsed.data,
  })
  if (!result.ok) return hrmActionFailure({ form: result.message })

  auditOffboarding({
    action: HRM_OFFBOARDING_EXIT_AUDIT.clearance_verified,
    actorUserId: gate.userId,
    actorSessionId: gate.sessionId,
    organizationId: gate.organizationId,
    resourceId: parsed.data.instanceId,
    metadata: {
      employeeId: parsed.data.employeeId,
      itemKey: parsed.data.itemKey,
      status: parsed.data.status,
      clearanceItemId: result.itemId,
    },
  })

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}
