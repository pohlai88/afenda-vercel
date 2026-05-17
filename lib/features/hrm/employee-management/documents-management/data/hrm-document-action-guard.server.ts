import "server-only"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { HrmDocumentMutationFormState } from "../../../types"

export type HrmDocumentMutationFunction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "search"
  | "audit"

/**
 * Tenant slug match + ERP RBAC for HRM document vault Server Actions.
 * `organizationId` is always taken from the session — never from form fields.
 */
export async function requireHrmDocumentMutationGate(
  formData: FormData,
  functionName: HrmDocumentMutationFunction
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: HrmDocumentMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireHrmPermission({
    object: "document",
    function: functionName,
    errorMessage: `HRM document ${functionName} permission required for this operation.`,
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
