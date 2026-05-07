"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { APIError } from "better-auth/api"
import { z } from "zod"

import { auth } from "#lib/auth/config.server"
import {
  assertOrgInviteRateAllowed,
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

const emailSchema = z.string().trim().email().max(320)
const inviteRoleSchema = z.enum(["member", "admin"])
const memberRoleSchema = z.enum(["member", "admin", "owner"])
const idSchema = z.string().trim().min(1).max(128)

export type OrgAdminActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | null

function revalidateOrganizationAdminSurfaces() {
  revalidatePath(toLocaleRoutePattern("/account/organization"), "page")
  revalidatePath(toLocaleOrgAdminRevalidatePattern(""), "layout")
}

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

function invitationIdFromCreateResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const o = result as Record<string, unknown>
  if (typeof o.id === "string") return o.id
  const inv = o.invitation
  if (inv && typeof inv === "object") {
    const id = (inv as { id?: string }).id
    if (typeof id === "string") return id
  }
  return null
}

async function requireOrgAdminActionSession() {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return {
      session: null as typeof session | null,
      error: "Admin access required.",
    }
  }
  return { session, error: null as string | null }
}

export async function inviteMemberAction(
  _prev: OrgAdminActionState,
  formData: FormData
): Promise<OrgAdminActionState> {
  const gate = await requireOrgAdminActionSession()
  if (gate.error || !gate.session) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const parsedEmail = emailSchema.safeParse(formData.get("email"))
  if (!parsedEmail.success) {
    return { ok: false, error: "Enter a valid email address." }
  }
  const parsedRole = inviteRoleSchema.safeParse(
    formData.get("role") ?? "member"
  )
  if (!parsedRole.success) {
    return { ok: false, error: "Invalid role." }
  }

  const rate = await assertOrgInviteRateAllowed({
    organizationId: session.organizationId,
    actorUserId: session.userId,
  })
  if (!rate.ok) {
    return { ok: false, error: rate.error }
  }

  try {
    const result = await auth.api.createInvitation({
      body: {
        email: parsedEmail.data,
        role: parsedRole.data,
        organizationId: session.organizationId,
      },
      headers: await headers(),
    })
    const invitationId = invitationIdFromCreateResult(result)
    await writeIamAuditEventFromNextHeaders({
      action: "org.member.invite",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "invitation",
      resourceId: invitationId,
      metadata: {
        email: parsedEmail.data,
        role: parsedRole.data,
      },
    })
    revalidateOrganizationAdminSurfaces()
    return { ok: true, message: "Invitation sent." }
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }
}

export async function cancelInvitationAction(
  _prev: OrgAdminActionState,
  formData: FormData
): Promise<OrgAdminActionState> {
  const gate = await requireOrgAdminActionSession()
  if (gate.error || !gate.session) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const invId = idSchema.safeParse(formData.get("invitationId"))
  if (!invId.success) {
    return { ok: false, error: "Invalid invitation." }
  }

  try {
    await auth.api.cancelInvitation({
      body: { invitationId: invId.data },
      headers: await headers(),
    })
    await writeIamAuditEventFromNextHeaders({
      action: "org.invitation.cancel",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "invitation",
      resourceId: invId.data,
    })
    revalidateOrganizationAdminSurfaces()
    return { ok: true, message: "Invitation cancelled." }
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }
}

export async function updateMemberRoleAction(
  _prev: OrgAdminActionState,
  formData: FormData
): Promise<OrgAdminActionState> {
  const gate = await requireOrgAdminActionSession()
  if (gate.error || !gate.session) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const memberId = idSchema.safeParse(formData.get("memberId"))
  const targetUserId = z
    .string()
    .trim()
    .min(1)
    .safeParse(formData.get("targetUserId"))
  const role = memberRoleSchema.safeParse(formData.get("role"))

  if (!memberId.success || !targetUserId.success) {
    return { ok: false, error: "Invalid member." }
  }
  if (!role.success) {
    return { ok: false, error: "Invalid role." }
  }
  if (targetUserId.data === session.userId) {
    return { ok: false, error: "You cannot change your own role." }
  }

  if (role.data === "owner") {
    const ownerGate = await canActInOrganization(
      session.userId,
      session.user.role,
      session.organizationId,
      "owner"
    )
    if (!ownerGate) {
      return {
        ok: false,
        error: "Only an organization owner can assign the owner role.",
      }
    }
  }

  try {
    await auth.api.updateMemberRole({
      body: {
        memberId: memberId.data,
        role: role.data,
        organizationId: session.organizationId,
      },
      headers: await headers(),
    })
    await writeIamAuditEventFromNextHeaders({
      action: "org.member.role.update",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "member",
      resourceId: memberId.data,
      metadata: { role: role.data, targetUserId: targetUserId.data },
    })
    revalidateOrganizationAdminSurfaces()
    return { ok: true, message: "Role updated." }
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }
}

export async function removeMemberAction(
  _prev: OrgAdminActionState,
  formData: FormData
): Promise<OrgAdminActionState> {
  const gate = await requireOrgAdminActionSession()
  if (gate.error || !gate.session) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const memberId = idSchema.safeParse(formData.get("memberId"))
  const targetUserId = z
    .string()
    .trim()
    .min(1)
    .safeParse(formData.get("targetUserId"))

  if (!memberId.success || !targetUserId.success) {
    return { ok: false, error: "Invalid member." }
  }
  if (targetUserId.data === session.userId) {
    return { ok: false, error: "You cannot remove yourself." }
  }

  try {
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: memberId.data,
        organizationId: session.organizationId,
      },
      headers: await headers(),
    })
    await writeIamAuditEventFromNextHeaders({
      action: "org.member.remove",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "member",
      resourceId: memberId.data,
      metadata: { targetUserId: targetUserId.data },
    })
    revalidateOrganizationAdminSurfaces()
    return { ok: true, message: "Member removed." }
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) }
  }
}
