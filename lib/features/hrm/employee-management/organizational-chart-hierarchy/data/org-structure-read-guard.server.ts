import "server-only"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"

export async function requireOrgStructureReadPermission(): Promise<
  | { ok: true; organizationId: string; userId: string; sessionId: string }
  | { ok: false; error: string }
> {
  const gate = await requireHrmPermission({
    object: "organization",
    function: "read",
    errorMessage: "ERP organization read permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    userId: gate.session.userId,
    sessionId: gate.session.sessionId,
  }
}

export async function requireOrgStructureSearchPermission(): Promise<
  | { ok: true; organizationId: string; userId: string; sessionId: string }
  | { ok: false; error: string }
> {
  const gate = await requireHrmPermission({
    object: "organization",
    function: "search",
    errorMessage: "ERP organization search permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    userId: gate.session.userId,
    sessionId: gate.session.sessionId,
  }
}
