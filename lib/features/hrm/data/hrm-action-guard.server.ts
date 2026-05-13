import "server-only"

import { requireOrgSession } from "#lib/tenant"

import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import { validateHrmOrgSlugMatchesSession } from "./hrm-tenant-form.server"

export type HrmOrgSession = Awaited<ReturnType<typeof requireOrgSession>>

/**
 * Resolves the active org session and validates `orgSlug` hidden field
 * matches that session (IDOR guard for Server Actions that carry slug for redirects).
 */
export async function requireHrmOrgTenantFromForm(formData: FormData): Promise<
  | { ok: true; session: HrmOrgSession; orgSlug: string }
  | {
      ok: false
      response: { ok: false; errors: Record<string, string | undefined> }
    }
> {
  const session = await requireOrgSession()
  const tenant = await validateHrmOrgSlugMatchesSession(
    formData,
    session.organizationId
  )
  if (!tenant.ok) {
    return { ok: false, response: hrmActionFailure({ form: tenant.message }) }
  }
  return { ok: true, session, orgSlug: tenant.orgSlug }
}
