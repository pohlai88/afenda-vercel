import "server-only"

import { getEmployeePortalContext } from "./employee-portal-access.server"
import {
  EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
  type EmployeePortalContext,
} from "./employee-portal-access.shared"

export type EmployeePortalMutationGateSuccess = {
  readonly ok: true
  readonly context: EmployeePortalContext
}

export type EmployeePortalMutationGateFailure = {
  readonly ok: false
  readonly formError: typeof EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR
}

export type EmployeePortalMutationGateResult =
  | EmployeePortalMutationGateSuccess
  | EmployeePortalMutationGateFailure

/**
 * Resolves the signed-in employee portal session from `portalSlug` in form data.
 * Never trust `organizationId` or `employeeId` from the client — use `context` only.
 */
export async function requireEmployeePortalMutationGate(
  formData: FormData
): Promise<EmployeePortalMutationGateResult> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return { ok: false, formError: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR }
  }
  return requireEmployeePortalMutationGateFromSlug(rawPortalSlug)
}

export async function requireEmployeePortalMutationGateFromSlug(
  portalSlug: string
): Promise<EmployeePortalMutationGateResult> {
  const context = await getEmployeePortalContext(portalSlug.trim())
  if (!context) {
    return { ok: false, formError: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR }
  }
  return { ok: true, context }
}
