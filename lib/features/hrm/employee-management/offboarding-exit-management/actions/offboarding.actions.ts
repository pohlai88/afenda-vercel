"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { db } from "#lib/db"
import { hrmEmployee, hrmOffboardingInstance } from "#lib/db/schema"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { organizationHrmEmployeePath } from "../../../constants"
import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import type { OffboardingChecklistTask } from "../data/offboarding-defaults.shared"
import { buildDefaultOffboardingChecklist } from "../data/offboarding-defaults.shared"
import {
  HRM_OFFBOARDING_ACTIVE_STATUSES,
  HRM_OFFBOARDING_MUTABLE_STATUSES,
} from "../data/offboarding-exit-status.shared"
import {
  mergeOffboardingInstanceDetails,
} from "../data/offboarding-instance-metadata.server"
import { requireOffboardingMutationGate } from "../data/offboarding-action-guard.server"
import { completeOffboardingTaskFormSchema } from "../../offboarding-exit-management/schemas/offboarding.schema"
import {
  initiateOffboardingFormSchema,
  recordExitInterviewFeedbackFormSchema,
  reviewOffboardingApprovalFormSchema,
  scheduleExitInterviewFormSchema,
  setRehireEligibilityFormSchema,
  updateSettlementReadinessFormSchema,
} from "../schemas/offboarding-initiation.schema"
import { HRM_OFFBOARDING_EXIT_AUDIT } from "../offboarding-exit.contract"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function normalizeDateTimeInput(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00.000Z`
    : trimmed
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function checkboxBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === null) return undefined
  return value === "true" || value === "on"
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

async function getMutableOffboardingInstance(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
}) {
  const [instance] = await db
    .select({
      id: hrmOffboardingInstance.id,
      status: hrmOffboardingInstance.status,
      audit7w1h: hrmOffboardingInstance.audit7w1h,
    })
    .from(hrmOffboardingInstance)
    .where(
      and(
        eq(hrmOffboardingInstance.organizationId, input.organizationId),
        eq(hrmOffboardingInstance.id, input.instanceId),
        eq(hrmOffboardingInstance.employeeId, input.employeeId),
        inArray(hrmOffboardingInstance.status, [
          ...HRM_OFFBOARDING_MUTABLE_STATUSES,
        ])
      )
    )
    .limit(1)

  return instance ?? null
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
    effectiveSeparationDate: formData.get("effectiveSeparationDate") || undefined,
    noticeStartDate: formData.get("noticeStartDate") || undefined,
    noticeEndDate: formData.get("noticeEndDate") || undefined,
    requiredNoticeDays: optionalNumber(formData.get("requiredNoticeDays")),
    skipApproval: checkboxBoolean(formData.get("skipApproval")),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const existing = await db
    .select({ id: hrmOffboardingInstance.id })
    .from(hrmOffboardingInstance)
    .where(
      and(
        eq(hrmOffboardingInstance.organizationId, gate.organizationId),
        eq(hrmOffboardingInstance.employeeId, parsed.data.employeeId),
        inArray(hrmOffboardingInstance.status, [
          ...HRM_OFFBOARDING_ACTIVE_STATUSES,
        ])
      )
    )
    .limit(1)

  if (existing[0]) {
    return hrmActionFailure({
      form: "An active offboarding process already exists for this employee.",
    })
  }

  const status = parsed.data.skipApproval ? "open" : "pending_approval"
  const terminationDate = parseDateOnly(parsed.data.terminationDate)
  const audit7w1h = mergeOffboardingInstanceDetails(null, {
    exitType: parsed.data.exitType,
    exitReason: parsed.data.exitReason,
    lastWorkingDate: parsed.data.lastWorkingDate,
    noticeStartDate: parsed.data.noticeStartDate ?? null,
    noticeEndDate: parsed.data.noticeEndDate ?? null,
    settlementReadinessStatus: "pending_clearance",
    rehireEligibility: null,
  })

  const [row] = await db
    .insert(hrmOffboardingInstance)
    .values({
      organizationId: gate.organizationId,
      employeeId: parsed.data.employeeId,
      terminationDate,
      checklist: buildDefaultOffboardingChecklist(),
      status,
      audit7w1h,
      createdByUserId: gate.userId,
      updatedByUserId: gate.userId,
    })
    .returning({ id: hrmOffboardingInstance.id })

  await db
    .update(hrmEmployee)
    .set({
      resignationDate: terminationDate,
      lastWorkingDate: parseDateOnly(parsed.data.lastWorkingDate),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(
      and(
        eq(hrmEmployee.organizationId, gate.organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OFFBOARDING_EXIT_AUDIT.initiated,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: row.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        status,
        exitType: parsed.data.exitType,
      },
    })
  )

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

  const [instance] = await db
    .select({
      id: hrmOffboardingInstance.id,
      status: hrmOffboardingInstance.status,
      audit7w1h: hrmOffboardingInstance.audit7w1h,
    })
    .from(hrmOffboardingInstance)
    .where(
      and(
        eq(hrmOffboardingInstance.organizationId, gate.organizationId),
        eq(hrmOffboardingInstance.id, parsed.data.instanceId),
        eq(hrmOffboardingInstance.employeeId, parsed.data.employeeId)
      )
    )
    .limit(1)

  if (!instance || instance.status !== "pending_approval") {
    return hrmActionFailure({ form: "Pending offboarding approval not found." })
  }

  const approved = parsed.data.decision === "approved"
  await db
    .update(hrmOffboardingInstance)
    .set({
      status: approved ? "open" : "cancelled",
      audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
        approvalReviewNote: parsed.data.reviewNote ?? null,
      }),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: approved
        ? HRM_OFFBOARDING_EXIT_AUDIT.approved
        : HRM_OFFBOARDING_EXIT_AUDIT.rejected,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instance.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        reviewNote: parsed.data.reviewNote ?? null,
      },
    })
  )

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

  const instance = await getMutableOffboardingInstance({
    organizationId: gate.organizationId,
    instanceId: parsed.data.instanceId,
    employeeId: parsed.data.employeeId,
  })
  if (!instance) {
    return hrmActionFailure({ form: "Open offboarding instance not found." })
  }

  await db
    .update(hrmOffboardingInstance)
    .set({
      audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
        exitInterviewScheduledAt: parsed.data.scheduledAt,
        exitInterviewNote: parsed.data.interviewerNote ?? null,
      }),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OFFBOARDING_EXIT_AUDIT.exit_interview_scheduled,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instance.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        scheduledAt: parsed.data.scheduledAt,
      },
    })
  )

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

  const instance = await getMutableOffboardingInstance({
    organizationId: gate.organizationId,
    instanceId: parsed.data.instanceId,
    employeeId: parsed.data.employeeId,
  })
  if (!instance) {
    return hrmActionFailure({ form: "Open offboarding instance not found." })
  }

  await db
    .update(hrmOffboardingInstance)
    .set({
      audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
        exitInterviewCompletedAt: parsed.data.completedAt,
        exitInterviewFeedbackSummary: parsed.data.feedbackSummary,
        exitInterviewWouldRehire: parsed.data.wouldRehire ?? null,
      }),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OFFBOARDING_EXIT_AUDIT.exit_interview_completed,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instance.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        completedAt: parsed.data.completedAt,
        wouldRehire: parsed.data.wouldRehire ?? null,
      },
    })
  )

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
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid settlement fields." })
  }

  const instance = await getMutableOffboardingInstance({
    organizationId: gate.organizationId,
    instanceId: parsed.data.instanceId,
    employeeId: parsed.data.employeeId,
  })
  if (!instance) {
    return hrmActionFailure({ form: "Open offboarding instance not found." })
  }

  await db
    .update(hrmOffboardingInstance)
    .set({
      audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
        settlementReadinessStatus: parsed.data.settlementReadinessStatus,
        settlementBlockers: parsed.data.blockers ?? [],
      }),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  const settlementAuditAction =
    parsed.data.settlementReadinessStatus === "blocked"
      ? HRM_OFFBOARDING_EXIT_AUDIT.settlement_blocked
      : HRM_OFFBOARDING_EXIT_AUDIT.settlement_ready

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: settlementAuditAction,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instance.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        settlementReadinessStatus: parsed.data.settlementReadinessStatus,
      },
    })
  )

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

  const instance = await getMutableOffboardingInstance({
    organizationId: gate.organizationId,
    instanceId: parsed.data.instanceId,
    employeeId: parsed.data.employeeId,
  })
  if (!instance) {
    return hrmActionFailure({ form: "Open offboarding instance not found." })
  }

  await db
    .update(hrmOffboardingInstance)
    .set({
      audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
        rehireEligibility: parsed.data.rehireEligibility,
        rehireEligibilityNote: parsed.data.note ?? null,
      }),
      updatedAt: new Date(),
      updatedByUserId: gate.userId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OFFBOARDING_EXIT_AUDIT.rehire_eligibility_set,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instance.id,
      metadata: {
        employeeId: parsed.data.employeeId,
        rehireEligibility: parsed.data.rehireEligibility,
      },
    })
  )

  revalidateOffboardingViews(gate.orgSlug, parsed.data.employeeId)
  return { ok: true }
}


export async function completeOffboardingTaskAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, user, sessionId } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = completeOffboardingTaskFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    instanceId: formData.get("instanceId"),
    taskKey: formData.get("taskKey"),
    employeeId: formData.get("employeeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Missing or invalid offboarding fields." })
  }

  const { instanceId, taskKey, employeeId } = parsed.data

  const [row] = await db
    .select({
      id: hrmOffboardingInstance.id,
      checklist: hrmOffboardingInstance.checklist,
      status: hrmOffboardingInstance.status,
    })
    .from(hrmOffboardingInstance)
    .where(
      and(
        eq(hrmOffboardingInstance.organizationId, organizationId),
        eq(hrmOffboardingInstance.id, instanceId),
        eq(hrmOffboardingInstance.employeeId, employeeId)
      )
    )
    .limit(1)

  if (!row || row.status !== "open") {
    return hrmActionFailure({ form: "Offboarding instance not found." })
  }

  const list = (row.checklist as OffboardingChecklistTask[]) ?? []
  const next = list.map((t) =>
    t.taskKey === taskKey ? { ...t, completedAt: new Date().toISOString() } : t
  )

  const allDone = next.every((t) => t.completedAt !== null)

  await db
    .update(hrmOffboardingInstance)
    .set({
      checklist: next,
      status: allDone ? "completed" : "open",
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmOffboardingInstance.id, instanceId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OFFBOARDING_EXIT_AUDIT.task.complete,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_offboarding_instance",
      resourceId: instanceId,
      metadata: {
        taskKey,
        checklistStatus: allDone ? "completed" : "open",
      },
    })
  )

  revalidateOffboardingViews(orgSlug, employeeId)
  return { ok: true }
}

export async function completeOffboardingTaskFormAction(
  formData: FormData
): Promise<void> {
  void (await completeOffboardingTaskAction(undefined, formData))
}
