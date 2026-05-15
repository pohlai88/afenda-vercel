"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import {
  listOrgScopePolicies,
  upsertOrgOperationalScopePolicy,
} from "../data/operational-scope.queries.server"
import { setOrgScopePolicySchema } from "../schemas/operational-scope.schemas"
import { OPERATIONAL_SCOPE_AUDIT_ACTIONS } from "../operational-scope.contract"

type OkResult = { ok: true }
type ErrResult = { ok: false; error: string }
type AdminScopePolicyResult = OkResult | ErrResult

/**
 * Set (or update) the org-level policy for a scope type.
 * Tier A — requires tenant_key_admin or higher.
 *
 * A `mandatory` policy forces the scope dimension into every user's resolved
 * context; `blocked` hides it entirely; `allowed` is the default (users may
 * pin it voluntarily).
 */
export async function setOrgScopePolicyAction(
  input: unknown
): Promise<AdminScopePolicyResult> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const parsed = setOrgScopePolicySchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    }
  }

  const { scopeType, policy, audience, displayOrder } = parsed.data

  // Capture previous policy for audit metadata.
  const existing = (
    await listOrgScopePolicies(session.organizationId)
  ).find((p) => p.scopeType === scopeType && p.audience === audience)

  await upsertOrgOperationalScopePolicy({
    organizationId: session.organizationId,
    scopeType,
    policy,
    audience,
    displayOrder,
    updatedByUserId: session.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: OPERATIONAL_SCOPE_AUDIT_ACTIONS.ORG_POLICY_UPDATE,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "org_operational_scope_policy",
    resourceId: `${session.organizationId}:${scopeType}:${audience}`,
    metadata: {
      scopeType,
      policy,
      audience,
      displayOrder,
      previousPolicy: existing?.policy ?? null,
    },
  })

  revalidatePath(toLocaleOrgDashboardRevalidatePattern(""), "layout")
  return { ok: true }
}
