"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_APPS_HRM_EMPLOYEE_DETAIL,
  ORG_APPS_HRM_EMPLOYEES,
} from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"

import { requireEmployeeLifecycleRecordGate } from "../data/employee-lifecycle-action-guard.server"
import {
  changeEmploymentStatusMutation,
  confirmEmploymentMutation,
  initiateTerminationMutation,
  liftSuspensionMutation,
  loadEmployeeForLifecycleMutation,
  recordEmployeeMovementMutation,
  recordProbationOutcomeMutation,
  recordResignationMutation,
  recordRetirementMutation,
  setLastWorkingDateMutation,
  suspendEmployeeMutation,
} from "../data/employee-lifecycle.mutations.server"
import {
  changeEmploymentStatusFormSchema,
  confirmEmploymentFormSchema,
  initiateTerminationFormSchema,
  liftSuspensionFormSchema,
  recordEmployeeMovementFormSchema,
  recordProbationOutcomeFormSchema,
  recordResignationFormSchema,
  recordRetirementFormSchema,
  setLastWorkingDateFormSchema,
  suspendEmployeeFormSchema,
} from "../schemas/employment-status-change.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_EMPLOYEE_LIFECYCLE_AUDIT } from "../employee-lifecycle.contract"
import type { ContractMutationFormState } from "../../../types"

function revalidateEmployeeLifecycleSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

function firstFieldError(
  fieldErrors: Record<string, string[] | undefined>
): string | undefined {
  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0]
    if (message) return message
  }
  return undefined
}

function parseOptionalJsonRecord(
  raw: FormDataEntryValue | null
): Record<string, unknown> | undefined {
  if (raw == null || raw === "") return undefined
  try {
    const parsed = JSON.parse(String(raw)) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return undefined
  }
  return undefined
}

function isExpectedLifecycleError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false
  return (
    err.message.includes("transition") ||
    err.message.includes("not found") ||
    err.message.includes("archived") ||
    err.message.includes("required") ||
    err.message.includes("contract")
  )
}

async function runLifecycleMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly userId: string
  readonly sessionId: string
  readonly auditAction: string
  readonly auditMetadata?: Record<string, unknown>
  readonly mutate: () => Promise<void>
}): Promise<ContractMutationFormState> {
  const employee = await loadEmployeeForLifecycleMutation(
    input.organizationId,
    input.employeeId
  )
  if (!employee) {
    return hrmActionFailure({ form: "Employee not found." })
  }

  try {
    await input.mutate()
  } catch (err) {
    if (isExpectedLifecycleError(err)) {
      return hrmActionFailure({ form: err.message })
    }
    logUnexpectedServerError("hrm.employee.lifecycle", err, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    })
    return hrmActionFailure({
      form: "Unable to update employment lifecycle.",
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: input.auditAction,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_employee",
      resourceId: input.employeeId,
      metadata: input.auditMetadata ?? {},
    })
  )

  revalidateEmployeeLifecycleSurfaces()
  return { ok: true }
}

export async function recordProbationOutcomeAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = recordProbationOutcomeFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    contractId: formData.get("contractId"),
    outcome: formData.get("outcome"),
    newProbationEndDate: formData.get("newProbationEndDate") || undefined,
    terminationReason: formData.get("terminationReason") || undefined,
    reviewerNote: formData.get("reviewerNote") || undefined,
    effectiveDate: formData.get("effectiveDate"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, contractId, outcome, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.probation.outcome_recorded,
    auditMetadata: { outcome, contractId },
    mutate: () =>
      recordProbationOutcomeMutation({
        organizationId: gate.organizationId,
        employeeId,
        contractId,
        outcome,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function confirmEmploymentAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = confirmEmploymentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    effectiveDate: formData.get("effectiveDate"),
    confirmationNote: formData.get("confirmationNote") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.confirmation.approved,
    mutate: () =>
      confirmEmploymentMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function suspendEmployeeAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = suspendEmployeeFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    suspensionReason: formData.get("suspensionReason"),
    approvalReference: formData.get("approvalReference"),
    effectiveDate: formData.get("effectiveDate"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.suspension.initiated,
    mutate: () =>
      suspendEmployeeMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function liftSuspensionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = liftSuspensionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    restoreToStatus: formData.get("restoreToStatus"),
    liftReason: formData.get("liftReason"),
    effectiveDate: formData.get("effectiveDate"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.suspension.lifted,
    mutate: () =>
      liftSuspensionMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function recordResignationAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const noticeRaw = formData.get("noticePeriodDays")
  const parsed = recordResignationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    resignationDate: formData.get("resignationDate"),
    lastWorkingDate: formData.get("lastWorkingDate"),
    noticePeriodDays:
      noticeRaw != null && noticeRaw !== "" ? Number(noticeRaw) : undefined,
    resignationNote: formData.get("resignationNote") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, noticePeriodDays: _notice, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.resignation.initiated,
    mutate: () =>
      recordResignationMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function setLastWorkingDateAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = setLastWorkingDateFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    lastWorkingDate: formData.get("lastWorkingDate"),
    reason: formData.get("reason") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.resignation.last_working_date_set,
    mutate: () =>
      setLastWorkingDateMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function initiateTerminationAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = initiateTerminationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    terminationReason: formData.get("terminationReason"),
    approvalReference: formData.get("approvalReference"),
    effectiveDate: formData.get("effectiveDate"),
    lastWorkingDate: formData.get("lastWorkingDate") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.termination.initiated,
    mutate: () =>
      initiateTerminationMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function recordRetirementAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = recordRetirementFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    retirementDate: formData.get("retirementDate"),
    lastWorkingDate: formData.get("lastWorkingDate"),
    retirementNote: formData.get("retirementNote") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.retirement.initiated,
    mutate: () =>
      recordRetirementMutation({
        organizationId: gate.organizationId,
        employeeId,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function recordEmployeeMovementAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = recordEmployeeMovementFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    movementKind: formData.get("movementKind"),
    effectiveDate: formData.get("effectiveDate"),
    previousValues: parseOptionalJsonRecord(formData.get("previousValues")),
    newValues: parseOptionalJsonRecord(formData.get("newValues")),
    reason: formData.get("reason") || undefined,
    approvalReference: formData.get("approvalReference") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, movementKind, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.movement.recorded,
    auditMetadata: { movementKind },
    mutate: () =>
      recordEmployeeMovementMutation({
        organizationId: gate.organizationId,
        employeeId,
        movementKind,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}

export async function changeEmploymentStatusAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleRecordGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = changeEmploymentStatusFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    newStatus: formData.get("newStatus"),
    reason: formData.get("reason"),
    effectiveDate: formData.get("effectiveDate"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: firstFieldError(parsed.error.flatten().fieldErrors),
    })
  }

  const { employeeId, newStatus, ...rest } = parsed.data

  return runLifecycleMutation({
    organizationId: gate.organizationId,
    employeeId,
    userId: gate.userId,
    sessionId: gate.sessionId,
    auditAction: HRM_EMPLOYEE_LIFECYCLE_AUDIT.employment_status.changed,
    auditMetadata: { newStatus },
    mutate: () =>
      changeEmploymentStatusMutation({
        organizationId: gate.organizationId,
        employeeId,
        newStatus,
        ...rest,
        actorUserId: gate.userId,
      }),
  })
}
