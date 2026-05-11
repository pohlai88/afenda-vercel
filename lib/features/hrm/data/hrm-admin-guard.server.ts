import "server-only"

import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"
import type { OrgSession } from "#lib/tenant"

/**
 * Shared admin guard for all HRM Server Actions that require the `admin` role.
 *
 * Returns the full OrgSession on success so callers can destructure
 * `{ organizationId, userId, sessionId }` directly.
 */
export async function requireHrmAdmin(
  errorMessage?: string
): Promise<{ ok: false; error: string } | { ok: true; session: OrgSession }> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return {
      ok: false,
      error: errorMessage ?? "Admin role required for this HRM operation.",
    }
  }
  return { ok: true, session }
}
