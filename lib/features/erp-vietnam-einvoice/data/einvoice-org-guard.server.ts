import "server-only"

import { getOrganizationIdBySlug } from "#lib/org-slug.server"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

export async function validateEinvoiceOrgSlugMatchesSession(
  orgSlugRaw: string,
  sessionOrganizationId: string
): Promise<{ ok: true; orgSlug: string } | { ok: false; message: string }> {
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    return { ok: false, message: "Missing organization." }
  }
  const resolved = await getOrganizationIdBySlug(orgSlug)
  if (!resolved || resolved !== sessionOrganizationId) {
    return {
      ok: false,
      message: "You cannot modify records outside your active organization.",
    }
  }
  return { ok: true, orgSlug }
}
