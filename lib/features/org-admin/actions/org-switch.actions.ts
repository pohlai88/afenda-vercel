"use server"

import { eq, and } from "drizzle-orm"
import { redirect } from "next/navigation"

import { organizationNexusPath } from "#features/nexus"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { requireSignedInSession } from "#lib/tenant"
import { db } from "#lib/db"
import { neonAuthMember, neonAuthSession } from "#lib/db/schema-neon-auth"

/**
 * Server Action: switch the active organization for the signed-in user.
 *
 * Guards:
 * - User must be signed in.
 * - User must be a member of the target organization (IDOR guard).
 *
 * Audits: `iam.session.org_switch` (Tier S — tenancy change).
 *
 * After a successful switch, redirects to `/{locale}/o/{slug}/nexus`.
 */
export async function switchActiveOrgAction(
  targetOrgId: string
): Promise<never> {
  const session = await requireSignedInSession()

  // Verify user is actually a member of the target org.
  const [member] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, session.userId),
        eq(neonAuthMember.organizationId, targetOrgId)
      )
    )
    .limit(1)

  if (!member) {
    throw new Error("Not a member of the requested organization.")
  }

  // Update activeOrganizationId directly on the session row.
  await db
    .update(neonAuthSession)
    .set({ activeOrganizationId: targetOrgId })
    .where(eq(neonAuthSession.id, session.sessionId))

  await writeIamAuditEventFromNextHeaders({
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: targetOrgId,
    action: "iam.session.org_switch",
    resourceType: "organization",
    resourceId: targetOrgId,
    metadata: {},
  })

  const [slug, locale] = await Promise.all([
    getOrganizationSlugById(targetOrgId),
    getRequestAppLocale(),
  ])

  if (!slug) {
    throw new Error("Organization slug not found after switch.")
  }

  redirect(toLocalePath(locale, organizationNexusPath(slug)))
}
