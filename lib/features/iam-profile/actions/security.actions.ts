"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  auth,
  getOrgTenantContext,
  requireAuthShellSignedInSession,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgIamProfileRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

const tokenSchema = z.string().trim().min(1).max(512)

const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters.")
  .max(128)

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string }

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<ChangePasswordResult> {
  const current = passwordSchema.safeParse(input.currentPassword)
  const next = passwordSchema.safeParse(input.newPassword)
  if (!current.success) {
    return { ok: false, error: "Enter your current password." }
  }
  if (!next.success) {
    return { ok: false, error: next.error.issues[0]?.message ?? "Invalid new password." }
  }

  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  await requireRecentAuthStepUp({
    returnTo: await securityCenterReturnPath(),
  })

  const session = await requireAuthShellSignedInSession()
  const { error } = await auth.changePassword({
    currentPassword: current.data,
    newPassword: next.data,
    revokeOtherSessions: true,
  })
  if (error) {
    return { ok: false, error: error.message ?? "Could not change password." }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "iam.password.change",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "user",
    resourceId: session.userId,
    metadata: { source: "security_center", revokeOtherSessions: true },
  })

  revalidatePath(toLocaleOrgIamProfileRevalidatePattern("security"), "page")
  return { ok: true }
}

async function securityCenterReturnPath(): Promise<string> {
  const locale = await getRequestAppLocale()
  const { organizationId } = await getOrgTenantContext()
  const orgSlug = await getOrganizationSlugById(organizationId)
  if (!orgSlug) {
    throw new Error("Active organization slug is required for security actions.")
  }
  return toLocalePath(locale, organizationIamProfilePath(orgSlug, "security"))
}

export async function revokeSessionAction(
  token: string,
  sessionRowId?: string
) {
  const parsed = tokenSchema.parse(token)
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  const revoked = await auth.revokeSession({ token: parsed })
  if (revoked.error) {
    throw new Error(revoked.error.message ?? "Failed to revoke session.")
  }
  const session = await requireAuthShellSignedInSession()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "session",
    resourceId: sessionRowId ?? null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleOrgIamProfileRevalidatePattern("security"), "page")
}

export async function revokeOtherSessionsAction() {
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  const out = await auth.revokeOtherSessions({})
  if (out.error) {
    throw new Error(out.error.message ?? "Failed to revoke other sessions.")
  }
  const session = await requireAuthShellSignedInSession()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke_other",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "session",
    resourceId: null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleOrgIamProfileRevalidatePattern("security"), "page")
}
