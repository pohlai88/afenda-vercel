"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import {
  auth,
  requireAuthShellSignedInSession,
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { iamProfileReturnPath } from "../data/iam-profile-return-path.server"
import type { IamProfileActionResult } from "./identity.actions"

const confirmEmailSchema = z.string().trim().email().max(320)

export async function deleteAccountAction(
  confirmEmail: string
): Promise<IamProfileActionResult> {
  const parsed = confirmEmailSchema.safeParse(confirmEmail)
  if (!parsed.success) {
    return { ok: false, error: "Enter your account email to confirm deletion." }
  }

  const session = await requireAuthShellSignedInSession()
  const returnTo = await iamProfileReturnPath()
  await requireRecentAuthStepUp({ returnTo })

  if (parsed.data.toLowerCase() !== session.user.email.trim().toLowerCase()) {
    return { ok: false, error: "Confirmation email does not match your account." }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "iam.account.delete",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "user",
    resourceId: session.userId,
    metadata: { source: "iam_profile_danger" },
  })

  const { error } = await auth.deleteUser()
  if (error) {
    return { ok: false, error: error.message ?? "Could not delete account." }
  }

  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, "/sign-in"))
}
