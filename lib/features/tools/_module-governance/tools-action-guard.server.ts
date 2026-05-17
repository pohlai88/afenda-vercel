import "server-only"

import { requireOrgSession } from "#lib/auth"

import { toolsActionFailure } from "./tools-action-result.shared"
import { validateToolsOrgSlugMatchesSession } from "./tools-tenant-form.server"

export type ToolsOrgSession = Awaited<ReturnType<typeof requireOrgSession>>

export async function requireToolsOrgTenantFromForm(formData: FormData): Promise<
  | { ok: true; session: ToolsOrgSession; orgSlug: string }
  | {
      ok: false
      response: { ok: false; errors: Record<string, string | undefined> }
    }
> {
  const session = await requireOrgSession()
  const tenant = await validateToolsOrgSlugMatchesSession(
    formData,
    session.organizationId
  )
  if (!tenant.ok) {
    return { ok: false, response: toolsActionFailure({ form: tenant.message }) }
  }
  return { ok: true, session, orgSlug: tenant.orgSlug }
}
