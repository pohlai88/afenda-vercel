import "server-only"

import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import { requireHrmPermission } from "../../../hrm-admin-guard.server"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

export type OffboardingMutationFunction = "read" | "update" | "create"

/**
 * Tenant slug match + ERP RBAC for offboarding Server Actions.
 * Exit workflows use the `employee` object (same as boarding offboarding tasks).
 */
export async function requireOffboardingMutationGate(
  formData: FormData,
  functionName: OffboardingMutationFunction
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
    object: "employee",
    function: functionName,
    errorMessage: `HRM employee ${functionName} permission required for this offboarding operation.`,
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
