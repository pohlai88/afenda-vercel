import "server-only"

import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import { requireHrmPermission } from "../../../hrm-admin-guard.server"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

export type PayrollMutationFunction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "search"
  | "audit"

/**
 * Tenant slug match + ERP RBAC for payroll Server Actions with `orgSlug` in FormData.
 * `organizationId` is always taken from the session — never from form fields.
 */
export async function requirePayrollMutationGate(
  formData: FormData,
  functionName: PayrollMutationFunction
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
    object: "payroll",
    function: functionName,
    errorMessage: `HRM payroll ${functionName} permission required for this operation.`,
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

/** Payroll console actions without `orgSlug` in FormData — session org only. */
export async function requirePayrollSessionMutationGate(
  functionName: PayrollMutationFunction = "update"
): Promise<
  | {
      ok: true
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; error: string }
> {
  const permission = await requireHrmPermission({
    object: "payroll",
    function: functionName,
    errorMessage: `HRM payroll ${functionName} permission required for this operation.`,
  })
  if (!permission.ok) {
    return { ok: false, error: permission.error }
  }

  return {
    ok: true,
    organizationId: permission.session.organizationId,
    userId: permission.session.userId,
    sessionId: permission.session.sessionId,
  }
}
