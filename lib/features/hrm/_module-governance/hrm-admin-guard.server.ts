import "server-only"

import type { OrgSession } from "#lib/auth"
import { requireErpPermission } from "#features/erp-rbac/server"

/**
 * Shared permission guard for HRM Server Actions.
 *
 * Returns the full OrgSession on success so callers can destructure
 * `{ organizationId, userId, sessionId }` directly.
 */
export async function requireHrmPermission(input: {
  object: string
  function:
    | "create"
    | "read"
    | "update"
    | "delete"
    | "search"
    | "audit"
    | "predict"
  errorMessage?: string
}): Promise<{ ok: false; error: string } | { ok: true; session: OrgSession }> {
  const gate = await requireErpPermission({
    module: "hrm",
    object: input.object,
    function: input.function,
  })
  if (!gate.ok) {
    return {
      ok: false,
      error:
        input.errorMessage ??
        "HRM RBAC permission required for this operation.",
    }
  }
  return { ok: true, session: gate.session }
}

export async function requireHrmAdmin(
  errorMessage?: string
): Promise<{ ok: false; error: string } | { ok: true; session: OrgSession }> {
  return requireHrmPermission({
    object: "organization",
    function: "update",
    errorMessage:
      errorMessage ??
      "HRM organization permission required for this operation.",
  })
}
