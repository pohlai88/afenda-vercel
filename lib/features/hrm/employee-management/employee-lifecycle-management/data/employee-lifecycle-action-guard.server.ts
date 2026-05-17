import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBoardingInstance, hrmBoardingTask } from "#lib/db/schema"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

export type EmployeeLifecycleMutationFunction = "read" | "update" | "create"

export type EmployeeLifecyclePermissionObject = "onboarding" | "employee"

/**
 * Tenant slug match + ERP RBAC for employee lifecycle Server Actions.
 * `organizationId` is always taken from the session — never from form fields.
 */
export async function requireEmployeeLifecycleMutationGate(
  formData: FormData,
  functionName: EmployeeLifecycleMutationFunction,
  object: EmployeeLifecyclePermissionObject = "onboarding"
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireHrmPermission({
    object,
    function: functionName,
    errorMessage: `HRM ${object} ${functionName} permission required for this operation.`,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  if (permission.session.organizationId !== tenant.session.organizationId) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Organization context changed." }),
    }
  }

  return {
    ok: true,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.session.organizationId,
    userId: tenant.session.userId,
    sessionId: tenant.session.sessionId,
  }
}

/** Employment status / probation / suspension / movement mutations on `erp.hrm.employee`. */
export async function requireEmployeeLifecycleRecordGate(
  formData: FormData,
  functionName: EmployeeLifecycleMutationFunction = "update"
) {
  return requireEmployeeLifecycleMutationGate(
    formData,
    functionName,
    "employee"
  )
}

/**
 * Resolves ERP object from boarding instance kind, then enforces update permission.
 * Onboarding tasks → `onboarding`; offboarding tasks → `employee` (exit workflow).
 */
export async function requireBoardingTaskMutationGate(
  formData: FormData,
  taskId: string,
  functionName: EmployeeLifecycleMutationFunction = "update"
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
      kind: "onboarding" | "offboarding"
    }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const [row] = await db
    .select({ kind: hrmBoardingInstance.kind })
    .from(hrmBoardingTask)
    .innerJoin(
      hrmBoardingInstance,
      eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
    )
    .where(
      and(
        eq(hrmBoardingTask.organizationId, tenant.session.organizationId),
        eq(hrmBoardingTask.id, taskId)
      )
    )
    .limit(1)

  if (!row) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Boarding task not found." }),
    }
  }

  const kind = row.kind === "offboarding" ? "offboarding" : "onboarding"
  const object = kind === "offboarding" ? "employee" : "onboarding"

  const permission = await requireHrmPermission({
    object,
    function: functionName,
    errorMessage: `HRM ${object} ${functionName} permission required for this boarding task.`,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  if (permission.session.organizationId !== tenant.session.organizationId) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Organization context changed." }),
    }
  }

  return {
    ok: true,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.session.organizationId,
    userId: tenant.session.userId,
    sessionId: tenant.session.sessionId,
    kind,
  }
}
