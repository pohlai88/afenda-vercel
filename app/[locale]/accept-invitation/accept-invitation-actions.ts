"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import type { Route } from "next"
import { redirect } from "next/navigation"
import { APIError } from "better-auth/api"
import { z } from "zod"

import { auth } from "#lib/auth/config.server"
import {
  assertInvitationForUser,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"

const idSchema = z.string().trim().min(1).max(128)

export type AcceptInviteActionState = { ok: false; error: string } | null

function apiErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    const body = err.body as { message?: string } | undefined
    if (body?.message) return body.message
    if (typeof err.message === "string" && err.message.length > 0)
      return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return "Something went wrong."
}

export async function acceptOrganizationInvitationAction(
  _prev: AcceptInviteActionState,
  formData: FormData
): Promise<AcceptInviteActionState> {
  const session = await requireSignedInSession()
  const parsed = idSchema.safeParse(formData.get("invitationId"))
  if (!parsed.success) {
    return { ok: false, error: "Invalid invitation." }
  }
  const invitationId = parsed.data

  const guarded = await assertInvitationForUser(
    invitationId,
    session.user.email
  )
  if (!guarded.ok) {
    return { ok: false, error: guarded.error }
  }

  try {
    await auth.api.acceptInvitation({
      body: { invitationId },
      headers: await headers(),
    })
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "org.invitation.accept",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: guarded.organizationId,
    resourceType: "invitation",
    resourceId: invitationId,
  })
  revalidatePath(toLocaleOrgDashboardRevalidatePattern(""), "page")
  revalidatePath(toLocaleRoutePattern("/account/organization"), "page")
  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, "/dashboard") as Route)
}

export async function rejectOrganizationInvitationAction(
  _prev: AcceptInviteActionState,
  formData: FormData
): Promise<AcceptInviteActionState> {
  const session = await requireSignedInSession()
  const parsed = idSchema.safeParse(formData.get("invitationId"))
  if (!parsed.success) {
    return { ok: false, error: "Invalid invitation." }
  }
  const invitationId = parsed.data

  const guarded = await assertInvitationForUser(
    invitationId,
    session.user.email
  )
  if (!guarded.ok) {
    return { ok: false, error: guarded.error }
  }

  try {
    await auth.api.rejectInvitation({
      body: { invitationId },
      headers: await headers(),
    })
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "org.invitation.reject",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: guarded.organizationId,
    resourceType: "invitation",
    resourceId: invitationId,
  })
  revalidatePath(toLocaleRoutePattern("/onboarding"), "page")
  const locale = await getRequestAppLocale()
  return redirect(toLocalePath(locale, "/onboarding") as Route)
}
