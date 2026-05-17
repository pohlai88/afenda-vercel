import "server-only"

import { requireErpPermission } from "#features/erp-rbac/server"

import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { OrgStructureFormState } from "../../../types"

export type OrgStructureMutationFunction = "create" | "update" | "delete"

/**
 * Tenant slug match + ERP RBAC for org structure Server Actions.
 * `organizationId` is always taken from the session — never from form fields.
 */
export async function requireOrgStructureMutationGate(
  formData: FormData,
  functionName: OrgStructureMutationFunction
): Promise<
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: OrgStructureFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    module: "hrm",
    object: "organization",
    function: functionName,
  })
  if (!permission.ok) {
    return {
      ok: false,
      response: hrmActionFailure({
        form: "ERP organization permission required for this operation.",
      }),
    }
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
