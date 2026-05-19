"use server"

import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  FwaRequestMutationFormState,
  SeedFwaTypesFormState,
} from "../../../types"
import { submitFwaRequestFormSchema } from "../schemas/fwa.schema"
import {
  seedDefaultFwaArrangementTypes,
  submitFwaRequest,
} from "../data/fwa-request-commands.server"
import {
  findFwaEmployeeForUser,
  getFwaEmployeeForOrg,
} from "../data/fwa.queries.server"
import { revalidateFwaSurfaces } from "../data/fwa-revalidate.server"

export async function requestOwnFwaAction(
  _prev: FwaRequestMutationFormState | undefined,
  formData: FormData
): Promise<FwaRequestMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const employee = await findFwaEmployeeForUser(organizationId, userId)
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record.",
    })
  }

  const parsed = submitFwaRequestFormSchema.safeParse({
    employeeId: employee.id,
    arrangementTypeId: formData.get("arrangementTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    reason: formData.get("reason"),
    remoteLocation: formData.get("remoteLocation") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    expectedWeeklyHours: formData.get("expectedWeeklyHours") || undefined,
    reviewDate: formData.get("reviewDate") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      arrangementTypeId: errs.arrangementTypeId?.[0],
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      reason: errs.reason?.[0],
      remoteLocation: errs.remoteLocation?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  return submitFwaRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: data.employeeId,
    arrangementTypeId: data.arrangementTypeId,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    reason: data.reason,
    remoteLocation: data.remoteLocation ?? null,
    evidenceDocumentId: data.evidenceDocumentId ?? null,
    expectedWeeklyMinutes: data.expectedWeeklyHours
      ? Math.round(data.expectedWeeklyHours * 60)
      : null,
    reviewDate: data.reviewDate ?? null,
    initiatedBy: "employee",
  })
}

export async function applyFwaOnBehalfAction(
  _prev: FwaRequestMutationFormState | undefined,
  formData: FormData
): Promise<FwaRequestMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = submitFwaRequestFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    arrangementTypeId: formData.get("arrangementTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    reason: formData.get("reason"),
    remoteLocation: formData.get("remoteLocation") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    expectedWeeklyHours: formData.get("expectedWeeklyHours") || undefined,
    reviewDate: formData.get("reviewDate") || null,
    eligibilityExceptionReason:
      formData.get("eligibilityExceptionReason") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: errs.employeeId?.[0],
      arrangementTypeId: errs.arrangementTypeId?.[0],
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      reason: errs.reason?.[0],
      remoteLocation: errs.remoteLocation?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const [employee, callerEmployee, hasUpdate, hasCreate] = await Promise.all([
    getFwaEmployeeForOrg(organizationId, parsed.data.employeeId),
    findFwaEmployeeForUser(organizationId, userId),
    canUseErpPermission({
      organizationId,
      userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "update",
      },
    }),
    canUseErpPermission({
      organizationId,
      userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "create",
      },
    }),
  ])

  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  let initiatedBy: "manager" | "hr"
  if (hasUpdate) {
    initiatedBy = "hr"
  } else if (
    hasCreate &&
    callerEmployee &&
    employee.managerEmployeeId === callerEmployee.id
  ) {
    initiatedBy = "manager"
  } else {
    return hrmActionFailure({
      form: "HR update permission or line-manager create access is required.",
    })
  }

  const { data } = parsed
  return submitFwaRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: data.employeeId,
    arrangementTypeId: data.arrangementTypeId,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    reason: data.reason,
    remoteLocation: data.remoteLocation ?? null,
    evidenceDocumentId: data.evidenceDocumentId ?? null,
    expectedWeeklyMinutes: data.expectedWeeklyHours
      ? Math.round(data.expectedWeeklyHours * 60)
      : null,
    reviewDate: data.reviewDate ?? null,
    initiatedBy,
    eligibilityExceptionReason: data.eligibilityExceptionReason ?? null,
  })
}

export async function seedDefaultFwaTypesAction(
  _prev: SeedFwaTypesFormState | undefined,
  _formData: FormData
): Promise<SeedFwaTypesFormState> {
  const gate = await requireHrmPermission({
    object: "flexible_work",
    function: "update",
    errorMessage: "Flexible work update permission required to seed types.",
  })
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }

  const { session } = gate
  const result = await seedDefaultFwaArrangementTypes({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
  })

  revalidateFwaSurfaces()
  return { ok: true, seeded: result.seeded, skipped: result.skipped }
}
