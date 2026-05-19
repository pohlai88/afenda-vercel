import "server-only"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"

/**
 * ERP RBAC for multi-country payroll RSC surfaces (config + cross-country report).
 * Uses the `payroll` object — country config is not a separate ERP permission tree.
 */
export type MultiCountryPayrollAccessFailureReason = "permission_denied"

export async function requireMultiCountryPayrollSearchSession(): Promise<
  | {
      ok: true
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; reason: MultiCountryPayrollAccessFailureReason }
> {
  const permission = await requireHrmPermission({
    object: "payroll",
    function: "search",
    errorMessage:
      "HRM payroll search permission required for multi-country payroll surfaces.",
  })
  if (!permission.ok) {
    return { ok: false, reason: "permission_denied" }
  }

  return {
    ok: true,
    organizationId: permission.session.organizationId,
    userId: permission.session.userId,
    sessionId: permission.session.sessionId,
  }
}
