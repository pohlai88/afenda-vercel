import "server-only"

import type { OrgSession } from "#lib/auth"
import { requireErpPermission } from "#features/erp-rbac/server"

export async function requireToolsErpPermission(input: {
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
        "ERP permission required for this tools operation.",
    }
  }
  return { ok: true, session: gate.session }
}
