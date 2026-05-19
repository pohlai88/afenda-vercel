"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import {
  auth,
  getOrgTenantContext,
  requireAuthShellSignedInSession,
  setActiveOrganizationForSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgIamProfileRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { organizationNexusPath } from "#features/nexus"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

import type { IamProfileActionResult } from "./identity.actions"

const orgIdSchema = z.string().trim().min(1).max(128)

async function countOwners(organizationId: string): Promise<number> {
  const rows = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.organizationId, organizationId),
        eq(neonAuthMember.role, "owner")
      )
    )
  return rows.length
}

export async function setActiveOrganizationAction(
  organizationId: string
): Promise<IamProfileActionResult> {
  const parsed = orgIdSchema.safeParse(organizationId)
  if (!parsed.success) {
    return { ok: false, error: "Invalid organization." }
  }

  const session = await requireAuthShellSignedInSession()
  await setActiveOrganizationForSession({
    userId: session.userId,
    sessionId: session.sessionId,
    organizationId: parsed.data,
  })

  const slug = await getOrganizationSlugById(parsed.data)
  if (slug) {
    revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
    revalidatePath(toLocaleOrgIamProfileRevalidatePattern(""), "page")
  }

  return { ok: true }
}

export async function leaveOrganizationAction(
  organizationId: string
): Promise<IamProfileActionResult> {
  const parsed = orgIdSchema.safeParse(organizationId)
  if (!parsed.success) {
    return { ok: false, error: "Invalid organization." }
  }

  const session = await requireAuthShellSignedInSession()
  const orgId = parsed.data

  const [membership] = await db
    .select({ role: neonAuthMember.role })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, session.userId),
        eq(neonAuthMember.organizationId, orgId)
      )
    )
    .limit(1)

  if (!membership) {
    return { ok: false, error: "You are not a member of this organization." }
  }

  if (membership.role === "owner") {
    const ownerCount = await countOwners(orgId)
    if (ownerCount <= 1) {
      return {
        ok: false,
        error:
          "You are the only owner. Transfer ownership or delete the organization before leaving.",
      }
    }
  }

  const leave = (
    auth as {
      organization?: {
        leave: (args: {
          organizationId: string
        }) => Promise<{ error?: { message: string } | null }>
      }
    }
  ).organization?.leave

  if (!leave) {
    return { ok: false, error: "Organization leave is not available." }
  }

  const { error } = await leave({ organizationId: orgId })
  if (error) {
    return { ok: false, error: error.message ?? "Could not leave organization." }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "org.member.leave",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: orgId,
    resourceType: "organization",
    resourceId: orgId,
    metadata: { source: "iam_profile_membership" },
  })

  revalidatePath(toLocaleOrgIamProfileRevalidatePattern(""), "page")

  const { organizationId: activeOrgId } = await getOrgTenantContext()
  if (activeOrgId === orgId) {
    const locale = await getRequestAppLocale()
    redirect(toLocalePath(locale, "/console"))
  }

  return { ok: true }
}

export async function openOrganizationWorkspaceAction(
  organizationId: string
): Promise<void> {
  const parsed = orgIdSchema.parse(organizationId)
  const locale = await getRequestAppLocale()
  const slug = await getOrganizationSlugById(parsed)
  if (!slug) {
    redirect(toLocalePath(locale, "/console"))
  }
  redirect(toLocalePath(locale, organizationNexusPath(slug)))
}
