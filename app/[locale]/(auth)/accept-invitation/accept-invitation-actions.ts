"use server"

import { revalidatePath } from "next/cache"
import type { Route } from "next"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { z } from "zod"

import {
  assertInvitationForUser,
  auth,
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { neonAuthOrganization } from "#lib/db/schema-neon-auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import type { AppPath } from "#lib/i18n/locales.shared"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"

const idSchema = z.string().trim().min(1).max(128)

export type AcceptInviteActionState = { ok: false; error: string } | null

function neonAuthErrorMessage(
  err: {
    message?: string
    statusText?: string
  } | null
): string {
  const m = err?.message?.trim()
  if (m) return m
  const s = err?.statusText?.trim()
  if (s) return s
  return "Something went wrong."
}

async function resolveV2PostAcceptPath(
  organizationId: string
): Promise<AppPath> {
  const [org] = await db
    .select({ slug: neonAuthOrganization.slug })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.id, organizationId))
    .limit(1)
  const slug = org?.slug?.trim()
  if (slug) return `/o/${slug}/dashboard` as AppPath
  return "/account"
}

export async function acceptOrganizationInvitationAction(
  _prev: AcceptInviteActionState,
  formData: FormData
): Promise<AcceptInviteActionState> {
  const session = await requireAuthShellSignedInSession()
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

  const accept = await auth.organization.acceptInvitation({ invitationId })
  if (accept.error) {
    return { ok: false, error: neonAuthErrorMessage(accept.error) }
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
  revalidatePath(toLocaleOrgAdminRevalidatePattern(""), "layout")
  revalidatePath(toLocaleRoutePattern("/account"), "page")
  const locale = await getRequestAppLocale()
  const nextPath = await resolveV2PostAcceptPath(guarded.organizationId)
  redirect(toLocalePath(locale, nextPath) as unknown as Route)
}

export async function rejectOrganizationInvitationAction(
  _prev: AcceptInviteActionState,
  formData: FormData
): Promise<AcceptInviteActionState> {
  const session = await requireAuthShellSignedInSession()
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

  const reject = await auth.organization.rejectInvitation({ invitationId })
  if (reject.error) {
    return { ok: false, error: neonAuthErrorMessage(reject.error) }
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
  revalidatePath(toLocaleRoutePattern("/account"), "page")
  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, "/account") as Route)
}
