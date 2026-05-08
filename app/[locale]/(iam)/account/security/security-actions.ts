"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  auth,
  requireSignedInSession,
  requireVerifiedEmailForAccount,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth-v2"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath, toLocaleRoutePattern } from "#lib/i18n/locales.shared"

const tokenSchema = z.string().trim().min(1).max(512)
const passkeyIdSchema = z.string().trim().min(1).max(512)

async function securityCenterReturnPath(): Promise<string> {
  const locale = await getRequestAppLocale()
  return toLocalePath(locale, "/account/security")
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
  const session = await requireSignedInSession()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "session",
    resourceId: sessionRowId ?? null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleRoutePattern("/account/security"), "page")
}

export async function revokeOtherSessionsAction() {
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  const out = await auth.revokeOtherSessions({})
  if (out.error) {
    throw new Error(out.error.message ?? "Failed to revoke other sessions.")
  }
  const session = await requireSignedInSession()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke_other",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "session",
    resourceId: null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleRoutePattern("/account/security"), "page")
}

export async function deletePasskeyAction(id: string) {
  passkeyIdSchema.parse(id)
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  throw new Error(
    "Passkey removal is not available with Neon Auth in this deployment."
  )
}
