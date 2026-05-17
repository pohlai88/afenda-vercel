"use server"

import { redirect } from "next/navigation"

import { organizationNexusPath } from "#features/nexus"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import {
  requireSignedInSession,
  setActiveOrganizationForSession,
} from "#lib/auth"

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
  await setActiveOrganizationForSession({
    userId: session.userId,
    sessionId: session.sessionId,
    organizationId: targetOrgId,
  })

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
