"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { auth } from "#lib/auth/config.server"
import { requireVerifiedEmailForAccount } from "#lib/auth/policy.server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath, toLocaleRoutePattern } from "#lib/i18n/locales.shared"
import { getAuthSessionTrusted } from "#lib/session-cache"

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
  await auth.api.revokeSession({
    body: { token: parsed },
    headers: await headers(),
  })
  const session = await getAuthSessionTrusted()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke",
    actorUserId: session?.user?.id ?? null,
    actorSessionId: session?.session?.id ?? null,
    resourceType: "session",
    resourceId: sessionRowId ?? null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleRoutePattern("/account/security"), "page")
}

export async function revokeOtherSessionsAction() {
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  await auth.api.revokeOtherSessions({
    headers: await headers(),
  })
  const session = await getAuthSessionTrusted()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.session.revoke_other",
    actorUserId: session?.user?.id ?? null,
    actorSessionId: session?.session?.id ?? null,
    resourceType: "session",
    resourceId: null,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleRoutePattern("/account/security"), "page")
}

export async function deletePasskeyAction(id: string) {
  const parsed = passkeyIdSchema.parse(id)
  await requireVerifiedEmailForAccount(await securityCenterReturnPath())
  await auth.api.deletePasskey({
    body: { id: parsed },
    headers: await headers(),
  })
  const session = await getAuthSessionTrusted()
  await writeIamAuditEventFromNextHeaders({
    action: "iam.passkey.remove",
    actorUserId: session?.user?.id ?? null,
    actorSessionId: session?.session?.id ?? null,
    resourceType: "passkey",
    resourceId: parsed,
    metadata: { source: "security_center" },
  })
  revalidatePath(toLocaleRoutePattern("/account/security"), "page")
}
