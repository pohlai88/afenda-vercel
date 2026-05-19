"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  auth,
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgIamProfileRevalidatePattern } from "#lib/i18n/locales.shared"

import { iamProfileReturnPath } from "../data/iam-profile-return-path.server"

export type IamProfileActionResult = { ok: true } | { ok: false; error: string }

export async function sendVerificationEmailAction(): Promise<IamProfileActionResult> {
  const session = await requireAuthShellSignedInSession()
  const callbackURL = await iamProfileReturnPath("identity")

  const { error } = await auth.sendVerificationEmail({
    email: session.user.email,
    callbackURL,
  })
  if (error) {
    return {
      ok: false,
      error: error.message ?? "Could not send verification email.",
    }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "iam.email.verification.resend",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "user",
    resourceId: session.userId,
    metadata: { source: "iam_profile_identity" },
  })

  revalidatePath(toLocaleOrgIamProfileRevalidatePattern("identity"), "page")
  revalidatePath(toLocaleOrgIamProfileRevalidatePattern(""), "page")
  return { ok: true }
}

const nameSchema = z.string().trim().min(1).max(120)

export async function updateDisplayNameAction(
  displayName: string
): Promise<IamProfileActionResult> {
  const parsed = nameSchema.safeParse(displayName)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a display name between 1 and 120 characters.",
    }
  }

  await requireAuthShellSignedInSession()
  const { error } = await auth.updateUser({ name: parsed.data })
  if (error) {
    return { ok: false, error: error.message ?? "Could not update profile." }
  }

  revalidatePath(toLocaleOrgIamProfileRevalidatePattern("identity"), "page")
  revalidatePath(toLocaleOrgIamProfileRevalidatePattern(""), "page")
  return { ok: true }
}
