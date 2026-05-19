"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  assertOrgInviteRateAllowed,
  auth,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { neonAuthErrorMessage } from "#lib/auth/neon-auth-error.shared"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import type { requireOrgSession } from "#lib/auth"

const emailSchema = z.string().trim().email().max(320)
const inviteRoleSchema = z.enum(["member"])
const idSchema = z.string().trim().min(1).max(128)

export type OrgAdminActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | null

function revalidateOrgAdminSurface() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern(""), "layout")
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
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return {
      session: null as Awaited<ReturnType<typeof requireOrgSession>> | null,
      error: gate.error,
    }
  }
  return { session: gate.session, error: null as string | null }
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
  const parsedRole = inviteRoleSchema.safeParse("member")
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
    const result = await auth.organization.inviteMember({
      organizationId: session.organizationId,
      email: parsedEmail.data,
      role: parsedRole.data,
    })
    if (result.error) {
      return { ok: false, error: neonAuthErrorMessage(result.error) }
    }
    const invitationId = invitationIdFromCreateResult(result.data)
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
    revalidateOrgAdminSurface()
    return { ok: true, message: "Invitation sent." }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    }
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
    const result = await auth.organization.cancelInvitation({
      invitationId: invId.data,
    })
    if (result.error) {
      return { ok: false, error: neonAuthErrorMessage(result.error) }
    }
    await writeIamAuditEventFromNextHeaders({
      action: "org.invitation.cancel",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "invitation",
      resourceId: invId.data,
    })
    revalidateOrgAdminSurface()
    return { ok: true, message: "Invitation cancelled." }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    }
  }
}

export async function updateMemberRoleAction(
  _prev: OrgAdminActionState,
  _formData: FormData
): Promise<OrgAdminActionState> {
  return {
    ok: false,
    error: "Tenant governance is now managed from Access control.",
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
    const result = await auth.organization.removeMember({
      memberIdOrEmail: memberId.data,
      organizationId: session.organizationId,
    })
    if (result.error) {
      return { ok: false, error: neonAuthErrorMessage(result.error) }
    }
    await writeIamAuditEventFromNextHeaders({
      action: "org.member.remove",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "member",
      resourceId: memberId.data,
      metadata: { targetUserId: targetUserId.data },
    })
    revalidateOrgAdminSurface()
    return { ok: true, message: "Member removed." }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    }
  }
}
