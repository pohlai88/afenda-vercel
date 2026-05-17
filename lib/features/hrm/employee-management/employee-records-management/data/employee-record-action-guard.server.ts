import "server-only"

import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import { requireHrmPermission } from "../../../hrm-admin-guard.server"
import { hrmActionFailure } from "../../../hrm-action-result.shared"

export type EmployeeRecordMutationPermission = "create" | "update" | "delete"

/**
 * Tenant slug match + ERP RBAC for employee record Server Actions.
 * `organizationId` is always taken from the session — never from form fields.
 */
export async function requireEmployeeRecordMutationGate(
  formData: FormData,
  input: {
    permission: EmployeeRecordMutationPermission
    errorMessage?: string
  }
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: { ok: false; errors: Record<string, string | undefined> } }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireHrmPermission({
    object: "employee",
    function: input.permission,
    errorMessage:
      input.errorMessage ??
      `HRM employee ${input.permission} permission required for this operation.`,
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
